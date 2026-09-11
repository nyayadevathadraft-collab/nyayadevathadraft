import { prisma } from "@/lib/prisma";
import { runStage1 } from "./stage1-ocr";
import { runStage2 } from "./stage2-facts";
import { runStage3 } from "./stage3-issues";
import { runStage4 } from "./stage4-statutes";
import { runStage5 } from "./stage5-caselaw";
import { runStage6 } from "./stage6-selection";
import { runStage7 } from "./stage7-draft";
import { runStage8 } from "./stage8-validate";
import type { PipelineAccumulator } from "./types";

async function updateMatterStage(matterId: string, stage: number, error?: string) {
  await prisma.matter.update({
    where: { id: matterId },
    data: {
      pipelineStage: stage,
      pipelineError: error ?? null,
      status: stage >= 6 && stage < 7 ? "awaiting_selection" : stage >= 8 ? "review" : "processing",
    },
  });
}

async function logAudit(matterId: string, tenantId: string, action: string, payload?: object) {
  await prisma.auditEvent.create({
    data: {
      matterId,
      tenantId,
      action,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      sourceRetrievedAt: new Date(),
    },
  });
}

/** Run stages 1-5 (OCR through case-law retrieval). Pauses before Stage 6 for user input. */
export async function runPipelinePhase1(acc: PipelineAccumulator): Promise<PipelineAccumulator> {
  const { matterId, tenantId } = acc;

  try {
    // Stage 1 — OCR
    await updateMatterStage(matterId, 1);
    acc.stage1 = await runStage1(matterId);
    await logAudit(matterId, tenantId, "stage1_complete", { docCount: acc.stage1.documents.length });

    // Stage 2 — Facts
    await updateMatterStage(matterId, 2);
    acc.stage2 = await runStage2(acc.stage1, {
      caseType: acc.caseType,
      side: acc.side,
      documentType: acc.documentType,
    });
    await logAudit(matterId, tenantId, "stage2_complete", { factCount: acc.stage2.facts.length });

    // Stage 3 — Issues
    await updateMatterStage(matterId, 3);
    acc.stage3 = await runStage3(acc.stage2, { caseType: acc.caseType, court: acc.court });
    await logAudit(matterId, tenantId, "stage3_complete", { issueCount: acc.stage3.issues.length });

    // Stage 4 — Statutes
    await updateMatterStage(matterId, 4);
    acc.stage4 = await runStage4(acc.stage3, matterId);
    await logAudit(matterId, tenantId, "stage4_complete", { statuteCount: acc.stage4.statutes.length });

    // Stage 5 — Case-law
    await updateMatterStage(matterId, 5);
    acc.stage5 = await runStage5(acc.stage2, acc.stage3, matterId);
    await logAudit(matterId, tenantId, "stage5_complete", { authorityCount: acc.stage5.suggestedAuthorities.length });

    // Pause here — pipeline_stage = 6 means "awaiting user authority selection"
    await updateMatterStage(matterId, 6);
    await logAudit(matterId, tenantId, "awaiting_user_selection");

    // Persist accumulator to DB for phase 2 resumption
    await prisma.matter.update({
      where: { id: matterId },
      data: { status: "awaiting_selection" },
    });

    return acc;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateMatterStage(matterId, acc.stage3 ? 3 : acc.stage2 ? 2 : 1, message);
    await logAudit(matterId, tenantId, "pipeline_error", { error: message });
    throw err;
  }
}

/** Run stages 7-8 after user has made authority selections. Creates a Draft record. */
export async function runPipelinePhase2(acc: PipelineAccumulator): Promise<string> {
  const { matterId, tenantId, userId } = acc;

  try {
    const matter = await prisma.matter.findUniqueOrThrow({ where: { id: matterId } });

    // Stage 6 — Read user selections
    await updateMatterStage(matterId, 7);
    acc.stage6 = await runStage6(acc.stage5!, matterId);
    await logAudit(matterId, tenantId, "stage6_complete", {
      included: acc.stage6.includedAuthorities.length,
      excluded: acc.stage6.excludedAuthorities.length,
    });

    // Stage 7 — Draft generation
    acc.stage7 = await runStage7(acc.stage2!, acc.stage3!, acc.stage4!, acc.stage6, {
      court: acc.court,
      state: acc.state,
      district: matter.district,
      caseType: acc.caseType,
      side: acc.side,
      documentType: acc.documentType,
      clientName: matter.clientName,
      matterTitle: matter.title,
    });
    await logAudit(matterId, tenantId, "stage7_complete");

    // Stage 8 — Validation
    await updateMatterStage(matterId, 8);
    acc.stage8 = await runStage8(acc.stage7, acc.stage4!, acc.stage6, {
      caseType: acc.caseType,
      court: acc.court,
    });
    await logAudit(matterId, tenantId, "stage8_complete", {
      flags: acc.stage8.reviewFlags.length,
      ready: acc.stage8.readyToExport,
    });

    // Persist draft
    const draftContent = {
      courtHeading: acc.stage7.draft.courtHeading,
      causeTitle: acc.stage7.draft.causeTitle,
      documentTitle: acc.stage7.draft.documentTitle,
      sections: acc.stage7.draft.sections,
      missingPlaceholders: acc.stage7.draft.missingPlaceholders,
    };

    const draft = await prisma.draft.create({
      data: {
        matterId,
        tenantId,
        createdById: userId,
        documentType: acc.documentType,
        version: 1,
        content: draftContent,
        contentText: acc.stage7.draft.sections.map((s) => s.content).join("\n"),
        status: acc.stage8.readyToExport ? "review" : "review",
        reviewFlags: JSON.parse(JSON.stringify(acc.stage8.reviewFlags)),
        draftingNotes: acc.stage7.draft.draftingNotes,
      },
    });

    // Save citations
    for (const cv of acc.stage8.citationValidation) {
      const matchingAuth = acc.stage6.includedAuthorities.find(
        (a) => a.citation && cv.citation.includes(a.citation)
      );
      const matchingStatute = acc.stage4!.statutes.find((s) =>
        cv.citation.includes(s.actName)
      );

      await prisma.citation.create({
        data: {
          draftId: draft.id,
          authorityId: matchingAuth?.dbId ?? null,
          statuteRefId: matchingStatute?.dbId ?? null,
          citedProposition: cv.citation,
          verificationState: cv.state,
        },
      });
    }

    await prisma.matter.update({
      where: { id: matterId },
      data: { status: "review", pipelineStage: 8 },
    });

    return draft.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateMatterStage(matterId, 7, message);
    await logAudit(matterId, tenantId, "pipeline_error", { error: message });
    throw err;
  }
}
