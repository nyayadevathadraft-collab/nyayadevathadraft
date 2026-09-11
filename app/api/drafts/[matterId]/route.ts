import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matterId: string }> }
) {
  const { matterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const drafts = await prisma.draft.findMany({
    where: { matterId, tenantId: dbUser.tenantId },
    include: { citations: { include: { authority: true, statuteRef: true } } },
    orderBy: { version: "desc" },
  });

  return NextResponse.json({ drafts });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matterId: string }> }
) {
  const { matterId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const { draftId, content, contentText, status } = body;

  if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

  const existing = await prisma.draft.findFirst({
    where: { id: draftId, tenantId: dbUser.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  // Save as new version
  const newDraft = await prisma.draft.create({
    data: {
      matterId: existing.matterId,
      tenantId: existing.tenantId,
      createdById: dbUser.id,
      documentType: existing.documentType,
      version: existing.version + 1,
      content: content ?? existing.content,
      contentText: contentText ?? existing.contentText,
      status: status ?? existing.status,
      reviewFlags: existing.reviewFlags,
      draftingNotes: existing.draftingNotes,
    },
  });

  await prisma.auditEvent.create({
    data: {
      matterId,
      tenantId: dbUser.tenantId,
      actorId: dbUser.id,
      action: "draft_updated",
      payload: { draftId: newDraft.id, version: newDraft.version },
    },
  });

  return NextResponse.json({ draft: newDraft });
}
