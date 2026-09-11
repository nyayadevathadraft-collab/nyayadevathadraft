import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { runPipelinePhase1, runPipelinePhase2 } from "@/lib/ai/pipeline/orchestrator";
import { runManualPipeline } from "@/lib/ai/pipeline/orchestrator-manual";
import type { PipelineAccumulator } from "@/lib/ai/pipeline/types";
import type { ManualEntryInput } from "@/lib/ai/pipeline/stage1-manual";

// Inngest v4: createFunction(options, handler) — trigger is inside options

export const pipelinePhase1 = inngest.createFunction(
  {
    id: "pipeline-phase1",
    triggers: [{ event: "pipeline/phase1.start" }],
  },
  async ({ event, step }) => {
    const { matterId } = event.data as { matterId: string };

    const matter = await step.run("fetch-matter", async () => {
      return prisma.matter.findUniqueOrThrow({
        where: { id: matterId },
        include: { createdBy: true },
      });
    });

    const acc: PipelineAccumulator = {
      matterId,
      tenantId: matter.tenantId,
      userId: matter.createdById,
      court: matter.court,
      state: matter.state,
      caseType: matter.caseType,
      side: matter.side,
      documentType: matter.documentType,
    };

    await step.run("run-stages-1-to-5", async () => {
      await runPipelinePhase1(acc);
    });

    return { status: "awaiting_user_selection", matterId };
  }
);

export const pipelinePhase2 = inngest.createFunction(
  {
    id: "pipeline-phase2",
    triggers: [{ event: "pipeline/phase2.start" }],
  },
  async ({ event, step }) => {
    const { matterId, accJson } = event.data as { matterId: string; accJson: string };
    const acc: PipelineAccumulator = JSON.parse(accJson);

    const draftId = await step.run("run-stages-7-to-8", async () => {
      return runPipelinePhase2(acc);
    });

    return { status: "draft_ready", matterId, draftId };
  }
);

/** Manual entry pipeline — skips Stage 1 OCR, uses user-typed input instead */
export const pipelineManual = inngest.createFunction(
  {
    id: "pipeline-manual",
    triggers: [{ event: "pipeline/manual.start" }],
  },
  async ({ event, step }) => {
    const { matterId, tenantId, userId, input } = event.data as {
      matterId: string;
      tenantId: string;
      userId: string;
      input: ManualEntryInput;
    };

    await step.run("run-manual-stages-1-to-5", async () => {
      await runManualPipeline({ matterId, tenantId, userId, input });
    });

    return { status: "awaiting_user_selection", matterId };
  }
);

export const inngestFunctions = [pipelinePhase1, pipelinePhase2, pipelineManual];
