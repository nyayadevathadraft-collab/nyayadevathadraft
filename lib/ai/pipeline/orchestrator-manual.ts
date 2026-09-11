import { prisma } from "@/lib/prisma";
import { runStage1Manual } from "./stage1-manual";
import { runStage2 } from "./stage2-facts";
import { runStage3 } from "./stage3-issues";
import { runStage4 } from "./stage4-statutes";
import { runStage5 } from "./stage5-caselaw";
import type { ManualEntryInput } from "./stage1-manual";

async function updateStage(matterId: string, stage: number, error?: string) {
  await prisma.matter.update({
    where: { id: matterId },
    data: {
      pipelineStage: stage,
      pipelineError: error ?? null,
      status: stage === 6 ? "awaiting_selection" : "processing",
    },
  });
}

async function audit(matterId: string, tenantId: string, action: string, payload?: object) {
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

export async function runManualPipeline({
  matterId,
  tenantId,
  userId,
  input,
}: {
  matterId: string;
  tenantId: string;
  userId: string;
  input: ManualEntryInput;
}) {
  const matter = await prisma.matter.findUniqueOrThrow({ where: { id: matterId } });

  try {
    // Stage 1 — Manual entry instead of OCR
    await updateStage(matterId, 1);
    const stage1 = await runStage1Manual(matterId, tenantId, input);
    await audit(matterId, tenantId, "stage1_manual_complete", {
      mode: input.mode,
      entityCount: stage1.documents[0]?.entities.length ?? 0,
    });

    // Stage 2 — Facts (same as document pipeline)
    await updateStage(matterId, 2);
    const stage2 = await runStage2(stage1, {
      caseType: matter.caseType,
      side: matter.side,
      documentType: matter.documentType,
    });

    // Persist facts to DB (marked user_provided for structured, confirmed for extracted)
    await prisma.fact.deleteMany({ where: { matterId } }); // clear any previous run
    for (const fact of stage2.facts) {
      await prisma.fact.create({
        data: {
          matterId,
          tenantId,
          text: fact.text,
          category: fact.category,
          sourceDocId: fact.sourceDocId ?? null,
          sourcePage: fact.sourcePage ?? null,
          confidence: fact.confidence,
          status: fact.status,
        },
      });
    }
    await audit(matterId, tenantId, "stage2_complete", { factCount: stage2.facts.length });

    // Stage 3 — Issues
    await updateStage(matterId, 3);
    const stage3 = await runStage3(stage2, { caseType: matter.caseType, court: matter.court });

    for (const issue of stage3.issues) {
      await prisma.legalIssue.create({
        data: {
          matterId,
          tenantId,
          description: issue.description,
          proceduralStage: issue.proceduralStage ?? null,
          transitionFlag: issue.transitionFlag,
          transitionNote: issue.transitionNote ?? null,
          relatedFactIds: [],
        },
      });
    }
    await audit(matterId, tenantId, "stage3_complete", { issueCount: stage3.issues.length });

    // Stage 4 — Statutes
    await updateStage(matterId, 4);
    const stage4 = await runStage4(stage3, matterId);
    await audit(matterId, tenantId, "stage4_complete", { statuteCount: stage4.statutes.length });

    // Stage 5 — Case-law
    await updateStage(matterId, 5);
    const stage5 = await runStage5(stage2, stage3, matterId);
    await audit(matterId, tenantId, "stage5_complete", {
      authorityCount: stage5.suggestedAuthorities.length,
    });

    // Pause for user authority selection
    await updateStage(matterId, 6);
    await audit(matterId, tenantId, "awaiting_user_selection");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateStage(matterId, 1, message);
    await audit(matterId, tenantId, "pipeline_error", { error: message });
    throw err;
  }
}
