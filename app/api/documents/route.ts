import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, buildStorageKey } from "@/lib/storage/r2";
import { createHash } from "crypto";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
];

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const formData = await request.formData();
  const matterId = formData.get("matterId") as string;
  const files = formData.getAll("files") as File[];

  if (!matterId || files.length === 0) {
    return NextResponse.json({ error: "matterId and files are required" }, { status: 400 });
  }

  // Verify matter belongs to tenant
  const matter = await prisma.matter.findFirst({
    where: { id: matterId, tenantId: dbUser.tenantId },
  });
  if (!matter) return NextResponse.json({ error: "Matter not found" }, { status: 404 });

  const uploadedDocs: Record<string, unknown>[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File ${file.name} exceeds 50 MB limit` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");
    const storageKey = buildStorageKey(dbUser.tenantId, matterId, file.name);

    await uploadFile(storageKey, buffer, file.type);

    const doc = await prisma.document.create({
      data: {
        matterId,
        tenantId: dbUser.tenantId,
        filename: file.name,
        storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        contentHash: hash,
      },
    });

    uploadedDocs.push(doc as unknown as Record<string, unknown>);
  }

  await prisma.matter.update({
    where: { id: matterId },
    data: { status: "uploading" },
  });

  return NextResponse.json({ documents: uploadedDocs }, { status: 201 });
}
