import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

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

  const body = await request.json().catch(() => ({}));
  const phase = body.phase as "1" | "2" ?? "1";

  const matter = await prisma.matter.findFirst({
    where: { id: matterId, tenantId: dbUser.tenantId },
  });
  if (!matter) return NextResponse.json({ error: "Matter not found" }, { status: 404 });

  if (phase === "1") {
    const docCount = await prisma.document.count({ where: { matterId } });
    if (docCount === 0) {
      return NextResponse.json({ error: "Upload at least one document first" }, { status: 400 });
    }

    await inngest.send({ name: "pipeline/phase1.start", data: { matterId } });
    return NextResponse.json({ status: "started", phase: 1 });
  }

  if (phase === "2") {
    if (matter.pipelineStage !== 6) {
      return NextResponse.json(
        { error: "Complete authority selection first (Stage 6)" },
        { status: 400 }
      );
    }

    // Build accumulator from stored facts / statutes / stage outputs
    const [facts, issues, matterStatutes, matterAuthorities] = await Promise.all([
      prisma.fact.findMany({ where: { matterId } }),
      prisma.legalIssue.findMany({ where: { matterId } }),
      prisma.matterStatute.findMany({ where: { matterId }, include: { statuteRef: true } }),
      prisma.matterAuthority.findMany({ where: { matterId }, include: { authority: true } }),
    ]);

    const acc = {
      matterId,
      tenantId: dbUser.tenantId,
      userId: dbUser.id,
      court: matter.court,
      state: matter.state,
      caseType: matter.caseType,
      side: matter.side,
      documentType: matter.documentType,
      stage2: {
        facts: facts.map((f: typeof facts[number]) => ({
          text: f.text,
          category: f.category as "chronology",
          sourceDocId: f.sourceDocId ?? undefined,
          sourcePage: f.sourcePage ?? undefined,
          confidence: f.confidence,
          status: f.status as "confirmed",
        })),
        timeline: [],
        missingFacts: [],
        contradictions: [],
      },
      stage3: {
        issues: issues.map((i: typeof issues[number]) => ({
          description: i.description,
          proceduralStage: i.proceduralStage ?? undefined,
          applicableActs: [],
          transitionFlag: i.transitionFlag,
          transitionNote: i.transitionNote ?? undefined,
          relatedFactIndices: [],
        })),
        applicableActs: [],
        bnsApplicable: false,
        legacyLawQuestion: false,
        incidentDate: undefined,
      },
      stage4: {
        statutes: matterStatutes.map((ms: typeof matterStatutes[number]) => ({
          actName: ms.statuteRef.actName,
          section: ms.statuteRef.section,
          text: ms.statuteRef.currentText,
          sourceUrl: ms.statuteRef.sourceUrl,
          isOfficial: ms.statuteRef.isOfficial,
          retrievedAt: ms.statuteRef.retrievedAt.toISOString(),
          dbId: ms.statuteRef.id,
        })),
        unresolvedSections: [],
      },
      stage5: {
        suggestedAuthorities: matterAuthorities.map((ma: typeof matterAuthorities[number]) => ({
          caseTitle: ma.authority.caseTitle,
          citation: ma.authority.citation ?? undefined,
          court: ma.authority.court,
          holding: ma.authority.holding,
          treatment: ma.authority.treatment as "binding",
          similarityScore: ma.similarityScore ?? 0,
          relevanceNote: ma.relevanceNote ?? "",
          sourceUrl: ma.authority.sourceUrl,
          verified: ma.authority.verified,
          dbId: ma.authority.id,
        })),
      },
    };

    await inngest.send({
      name: "pipeline/phase2.start",
      data: { matterId, accJson: JSON.stringify(acc) },
    });

    return NextResponse.json({ status: "started", phase: 2 });
  }

  return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
}
