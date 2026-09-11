import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const matter = await prisma.matter.findFirst({
    where: { id, tenantId: dbUser.tenantId },
    include: {
      documents: true,
      facts: true,
      issues: true,
      statutes: { include: { statuteRef: true } },
      authorities: { include: { authority: true } },
      drafts: { orderBy: { version: "desc" } },
    },
  });

  if (!matter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ matter });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const allowedFields = ["title", "status"];
  const update = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowedFields.includes(k))
  );

  const matter = await prisma.matter.updateMany({
    where: { id, tenantId: dbUser.tenantId },
    data: update,
  });

  if (matter.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
