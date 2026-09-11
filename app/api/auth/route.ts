import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/** Called after sign-up to provision a tenant and user record in the app DB. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Idempotent — if user already exists, return it
  const existing = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (existing) return NextResponse.json({ user: existing });

  // Create a new tenant for this user (single-user mode — one tenant per user for now)
  const tenant = await prisma.tenant.create({
    data: {
      name: user.email?.split("@")[0] ?? "My Chambers",
      plan: "free",
    },
  });

  const dbUser = await prisma.user.create({
    data: {
      supabaseId: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name ?? null,
      tenantId: tenant.id,
      role: "advocate",
    },
  });

  return NextResponse.json({ user: dbUser }, { status: 201 });
}
