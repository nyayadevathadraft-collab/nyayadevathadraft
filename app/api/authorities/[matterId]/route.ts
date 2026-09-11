import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const selectionSchema = z.object({
  authorityId: z.string().uuid(),
  selection: z.enum(["included", "excluded", "research_only", "pending"]),
});

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

  const authorities = await prisma.matterAuthority.findMany({
    where: { matterId, matter: { tenantId: dbUser.tenantId } },
    include: { authority: true },
    orderBy: { similarityScore: "desc" },
  });

  return NextResponse.json({ authorities });
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
  const parsed = selectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { authorityId, selection } = parsed.data;

  await prisma.matterAuthority.updateMany({
    where: {
      matterId,
      authorityId,
      matter: { tenantId: dbUser.tenantId },
    },
    data: {
      selection,
      selectedById: dbUser.id,
      selectedAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      matterId,
      tenantId: dbUser.tenantId,
      actorId: dbUser.id,
      action: "authority_selection",
      payload: { authorityId, selection },
    },
  });

  return NextResponse.json({ success: true });
}
