import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createMatterSchema = z.object({
  title: z.string().min(3),
  clientName: z.string().min(2),
  court: z.string(),
  state: z.string(),
  district: z.string(),
  caseType: z.string(),
  side: z.string(),
  documentType: z.string(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const matters = await prisma.matter.findMany({
    where: { tenantId: dbUser.tenantId },
    orderBy: { createdAt: "desc" },
    include: { documents: { select: { id: true } } },
  });

  return NextResponse.json({ matters });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const parsed = createMatterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const matter = await prisma.matter.create({
    data: {
      ...parsed.data,
      tenantId: dbUser.tenantId,
      createdById: dbUser.id,
    },
  });

  await prisma.auditEvent.create({
    data: {
      matterId: matter.id,
      tenantId: dbUser.tenantId,
      actorId: dbUser.id,
      action: "matter_created",
      payload: { documentType: matter.documentType },
    },
  });

  return NextResponse.json({ matter }, { status: 201 });
}
