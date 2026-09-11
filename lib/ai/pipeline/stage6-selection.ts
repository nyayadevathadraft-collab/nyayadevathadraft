import { prisma } from "@/lib/prisma";
import type { Stage5Output, Stage6Output, AuthorityItem } from "./types";

/**
 * Stage 6 is a USER GATE — no AI runs here.
 * This function reads the user's include/exclude/research-only decisions
 * from the database and packages them for Stage 7.
 *
 * The pipeline pauses at Stage 5 and resumes from Stage 6
 * only after the user has made their selections in the UI.
 */
export async function runStage6(
  stage5: Stage5Output,
  matterId: string
): Promise<Stage6Output> {
  const matterAuthorities = await prisma.matterAuthority.findMany({
    where: { matterId },
    include: { authority: true },
  });

  const included: AuthorityItem[] = [];
  const excluded: AuthorityItem[] = [];
  const researchOnly: AuthorityItem[] = [];

  for (const ma of matterAuthorities) {
    const auth = ma.authority;
    const item: AuthorityItem = {
      caseTitle: auth.caseTitle,
      citation: auth.citation ?? undefined,
      court: auth.court,
      bench: auth.bench ?? undefined,
      judgmentDate: auth.judgmentDate?.toISOString(),
      holding: auth.holding,
      relevantParas: Array.isArray(auth.relevantParas) ? auth.relevantParas as string[] : undefined,
      treatment: auth.treatment as AuthorityItem["treatment"],
      similarityScore: ma.similarityScore ?? 0,
      relevanceNote: ma.relevanceNote ?? "",
      sourceUrl: auth.sourceUrl,
      verified: auth.verified,
      dbId: auth.id,
    };

    if (ma.selection === "included") included.push(item);
    else if (ma.selection === "excluded") excluded.push(item);
    else if (ma.selection === "research_only") researchOnly.push(item);
    // "pending" items are not included in the draft
  }

  return {
    includedAuthorities: included,
    excludedAuthorities: excluded,
    researchOnlyAuthorities: researchOnly,
  };
}
