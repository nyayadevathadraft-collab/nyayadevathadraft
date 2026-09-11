import { prisma } from "@/lib/prisma";
import { getStatuteConnectors } from "@/lib/connectors/registry";
import type { Stage3Output, Stage4Output, StatuteItem } from "./types";

export async function runStage4(
  stage3: Stage3Output,
  matterId: string
): Promise<Stage4Output> {
  const connectors = getStatuteConnectors();
  const statutes: StatuteItem[] = [];
  const unresolvedSections: Stage4Output["unresolvedSections"] = [];

  // Build list of (act, section) pairs from identified issues
  const actSectionPairs: { actName: string; section: string }[] = [];

  for (const issue of stage3.issues) {
    for (const act of issue.applicableActs) {
      // Extract section references from issue description
      const sectionMatches = issue.description.match(/[Ss]ection[s]?\s+([\d\w,\s]+)/g) ?? [];
      const sections = sectionMatches.flatMap((m) =>
        m.replace(/[Ss]ection[s]?\s+/g, "").split(/,\s*/)
      );

      if (sections.length === 0) {
        actSectionPairs.push({ actName: act, section: "" });
      } else {
        for (const s of sections) {
          actSectionPairs.push({ actName: act, section: s.trim() });
        }
      }
    }
  }

  // Deduplicate
  const uniquePairs = actSectionPairs.filter(
    (p, i, arr) => arr.findIndex((x) => x.actName === p.actName && x.section === p.section) === i
  );

  for (const { actName, section } of uniquePairs) {
    // Check if we already have this in DB
    const existing = await prisma.statuteRef.findFirst({
      where: { actName, section: section || "" },
    });

    if (existing) {
      const item: StatuteItem = {
        actName: existing.actName,
        section: existing.section,
        subsection: existing.subsection ?? undefined,
        text: existing.currentText,
        sourceUrl: existing.sourceUrl,
        isOfficial: existing.isOfficial,
        retrievedAt: existing.retrievedAt.toISOString(),
        dbId: existing.id,
      };
      statutes.push(item);

      await prisma.matterStatute.upsert({
        where: { matterId_statuteRefId: { matterId, statuteRefId: existing.id } },
        update: {},
        create: { matterId, statuteRefId: existing.id },
      });
      continue;
    }

    // Fetch fresh from connectors
    let fetched = false;
    for (const connector of connectors) {
      try {
        const result = await connector.getSection(actName, section || "1");
        if (result) {
          const dbRecord = await prisma.statuteRef.upsert({
            where: { actName_section_subsection: { actName, section: section || "", subsection: null } },
            update: {
              currentText: result.text,
              sourceUrl: result.sourceUrl,
              retrievedAt: result.retrievedAt,
            },
            create: {
              actName,
              section: section || "",
              currentText: result.text,
              commencementDate: result.commencementDate,
              amendmentHistory: result.amendmentHistory
                ? JSON.parse(JSON.stringify(result.amendmentHistory))
                : undefined,
              sourceConnectorId: connector.id,
              sourceUrl: result.sourceUrl,
              retrievedAt: result.retrievedAt,
              isOfficial: connector.isOfficial,
            },
          });

          await prisma.matterStatute.upsert({
            where: { matterId_statuteRefId: { matterId, statuteRefId: dbRecord.id } },
            update: {},
            create: { matterId, statuteRefId: dbRecord.id },
          });

          statutes.push({
            actName,
            section,
            text: result.text,
            sourceUrl: result.sourceUrl,
            isOfficial: connector.isOfficial,
            retrievedAt: result.retrievedAt.toISOString(),
            dbId: dbRecord.id,
          });

          fetched = true;
          break;
        }
      } catch (err) {
        console.error(`[Stage4] Connector ${connector.id} failed for ${actName} s.${section}:`, err);
      }
    }

    if (!fetched) {
      unresolvedSections.push({
        actName,
        section,
        reason: "Not found in any configured legal source. Please verify manually.",
      });
    }
  }

  return { statutes, unresolvedSections };
}
