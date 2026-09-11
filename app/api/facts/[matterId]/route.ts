import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { runStage1Manual } from "@/lib/ai/pipeline/stage1-manual";
import { runStage2 } from "@/lib/ai/pipeline/stage2-facts";
import { runStage3 } from "@/lib/ai/pipeline/stage3-issues";
import { runStage4 } from "@/lib/ai/pipeline/stage4-statutes";
import { runStage5 } from "@/lib/ai/pipeline/stage5-caselaw";
import { inngest } from "@/inngest/client";

const partySchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  address: z.string().optional(),
  contact: z.string().optional(),
});

const chronologySchema = z.object({
  date: z.string().optional(),
  event: z.string().min(1),
});

const manualEntrySchema = z.object({
  mode: z.enum(["freetext", "structured", "both"]),
  freeText: z.string().optional(),
  structured: z
    .object({
      parties: z.array(partySchema).default([]),
      chronology: z.array(chronologySchema).default([]),
      firNumber: z.string().optional(),
      caseNumber: z.string().optional(),
      policeStation: z.string().optional(),
      dateOfIncident: z.string().optional(),
      sectionsInvolved: z.string().optional(),
      priorProceedings: z.string().optional(),
      reliefSought: z.string().optional(),
      additionalContext: z.string().optional(),
    })
    .optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matterId: string }> }
) {
  const { matterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const matter = await prisma.matter.findFirst({
    where: { id: matterId, tenantId: dbUser.tenantId },
  });
  if (!matter) return NextResponse.json({ error: "Matter not found" }, { status: 404 });

  const body = await request.json();
  const parsed = manualEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  // Validate: freetext mode must have freeText; structured/both must have structured
  if ((input.mode === "freetext" || input.mode === "both") && !input.freeText?.trim()) {
    return NextResponse.json({ error: "freeText is required for this mode" }, { status: 400 });
  }
  if ((input.mode === "structured" || input.mode === "both") && !input.structured) {
    return NextResponse.json({ error: "structured data is required for this mode" }, { status: 400 });
  }

  await prisma.matter.update({
    where: { id: matterId },
    data: { status: "processing", pipelineStage: 1 },
  });

  await prisma.auditEvent.create({
    data: {
      matterId,
      tenantId: dbUser.tenantId,
      actorId: dbUser.id,
      action: "manual_entry_submitted",
      payload: { mode: input.mode },
    },
  });

  // Trigger the manual pipeline via Inngest
  await inngest.send({
    name: "pipeline/manual.start",
    data: {
      matterId,
      tenantId: dbUser.tenantId,
      userId: dbUser.id,
      input,
    },
  });

  return NextResponse.json({ status: "started" });
}
