import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateDocx } from "@/lib/doc-gen/docx";
import { generatePdf } from "@/lib/doc-gen/pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "docx";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const draft = await prisma.draft.findFirst({
    where: { id: draftId, tenantId: dbUser.tenantId },
    include: {
      citations: { include: { authority: true, statuteRef: true } },
      matter: true,
    },
  });

  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  await prisma.auditEvent.create({
    data: {
      matterId: draft.matterId,
      tenantId: dbUser.tenantId,
      actorId: dbUser.id,
      action: "draft_exported",
      payload: { draftId, format },
    },
  });

  if (format === "pdf") {
    const pdfBuffer = await generatePdf(draft as Parameters<typeof generatePdf>[0]);
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${draft.documentType}_v${draft.version}.pdf"`,
      },
    });
  }

  const docxBuffer = await generateDocx(draft as Parameters<typeof generateDocx>[0]);
  return new NextResponse(docxBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${draft.documentType}_v${draft.version}.docx"`,
    },
  });
}
