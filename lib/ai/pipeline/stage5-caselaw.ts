import { getFlashModel, embedText } from "../gemini";
import { prisma } from "@/lib/prisma";
import type { Stage2Output, Stage3Output, Stage5Output, AuthorityItem } from "./types";

export async function runStage5(
  stage2: Stage2Output,
  stage3: Stage3Output,
  matterId: string
): Promise<Stage5Output> {
  // Build a semantic query from facts and issues
  const queryText = [
    ...stage3.issues.map((i) => i.description),
    ...stage2.facts.filter((f) => f.status === "confirmed").map((f) => f.text),
  ]
    .join(". ")
    .slice(0, 2000);

  // Embed the query
  const queryEmbedding = await embedText(queryText);

  // Semantic search over stored authorities using pgvector
  // Since Prisma doesn't support vector operations natively, we use raw SQL
  const similar = await prisma.$queryRaw<
    {
      id: string;
      case_title: string;
      citation: string | null;
      court: string;
      bench: string | null;
      judgment_date: Date | null;
      holding: string;
      relevant_paras: unknown;
      treatment: string;
      source_url: string;
      verified: boolean;
      similarity: number;
    }[]
  >`
    SELECT
      id,
      case_title,
      citation,
      court,
      bench,
      judgment_date,
      holding,
      relevant_paras,
      treatment,
      source_url,
      verified,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
    FROM authorities
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT 15
  `;

  // Re-rank and filter with Gemini
  const model = getFlashModel();
  const reRankResult = await model.generateContent(`
You are a senior Indian advocate. Below are candidate precedents retrieved by semantic search for this matter.

Matter context:
- Case type: ${stage3.issues.map((i) => i.description).join("; ")}
- Applicable acts: ${stage3.applicableActs.join(", ")}
- BNS applicable: ${stage3.bnsApplicable}
- Key facts: ${stage2.facts.filter((f) => f.confidence > 0.7).map((f) => f.text).join("; ").slice(0, 1000)}

Candidate authorities:
${JSON.stringify(similar.map((a) => ({
  id: a.id,
  caseTitle: a.case_title,
  citation: a.citation,
  court: a.court,
  holding: a.holding,
  treatment: a.treatment,
  semanticScore: a.similarity,
})), null, 2)}

Return JSON with only the authorities that are genuinely relevant to this matter's legal issues.
For each, provide a plain-language relevance note and final score.
Do NOT include an authority merely because it looks similar — only include if the legal proposition applies.

{
  "selected": [
    {
      "id": "<authority id>",
      "similarityScore": <0.0-1.0>,
      "relevanceNote": "<why this applies to this specific matter>",
      "treatment": "binding|persuasive|overruled|analogous"
    }
  ]
}
`);

  const reRanked = JSON.parse(reRankResult.response.text()).selected as {
    id: string;
    similarityScore: number;
    relevanceNote: string;
    treatment: string;
  }[];

  type SimilarRow = typeof similar[number];
  const selectedIds = new Set(reRanked.map((r) => r.id));
  const authorities: AuthorityItem[] = similar
    .filter((a: SimilarRow) => selectedIds.has(a.id))
    .map((a: SimilarRow) => {
      const rank = reRanked.find((r) => r.id === a.id)!;
      return {
        caseTitle: a.case_title,
        citation: a.citation ?? undefined,
        court: a.court,
        bench: a.bench ?? undefined,
        judgmentDate: a.judgment_date?.toISOString(),
        holding: a.holding,
        relevantParas: Array.isArray(a.relevant_paras) ? a.relevant_paras : undefined,
        treatment: rank.treatment as AuthorityItem["treatment"],
        similarityScore: rank.similarityScore,
        relevanceNote: rank.relevanceNote,
        sourceUrl: a.source_url,
        verified: a.verified,
        dbId: a.id,
      };
    });

  // Link suggested authorities to the matter
  for (const auth of authorities) {
    if (!auth.dbId) continue;
    await prisma.matterAuthority.upsert({
      where: { matterId_authorityId: { matterId, authorityId: auth.dbId } },
      update: {
        similarityScore: auth.similarityScore,
        relevanceNote: auth.relevanceNote,
      },
      create: {
        matterId,
        authorityId: auth.dbId,
        similarityScore: auth.similarityScore,
        relevanceNote: auth.relevanceNote,
        selection: "pending",
      },
    });
  }

  return { suggestedAuthorities: authorities };
}
