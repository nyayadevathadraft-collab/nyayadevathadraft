import { getProModelText } from "../gemini";
import type {
  Stage2Output,
  Stage3Output,
  Stage4Output,
  Stage6Output,
  Stage7Output,
  DraftSection,
} from "./types";
import { COURT_TEMPLATES } from "@/lib/doc-gen/templates";

export async function runStage7(
  stage2: Stage2Output,
  stage3: Stage3Output,
  stage4: Stage4Output,
  stage6: Stage6Output,
  context: {
    court: string;
    state: string;
    district: string;
    caseType: string;
    side: string;
    documentType: string;
    clientName: string;
    matterTitle: string;
  }
): Promise<Stage7Output> {
  // NO-SOURCE-NO-ASSERTION: the model only receives verified facts and retrieved sources.
  const verifiedFacts = stage2.facts.filter(
    (f) => f.status === "confirmed" || f.status === "user_provided"
  );
  const assumptions = stage2.facts.filter((f) => f.status === "assumption");
  const gaps = stage2.missingFacts;

  const courtTemplate = COURT_TEMPLATES[context.court] ?? COURT_TEMPLATES["default"];

  const model = getProModelText();

  const prompt = `
You are a senior Indian advocate drafting a ${context.documentType} for ${context.court} in ${context.state}.

You MUST follow these strict rules:
1. Use ONLY the verified facts, statutes, and authorities provided below — no other sources.
2. If information is missing, insert a placeholder: [INSERT: description]
3. Mark every assertion type clearly in your output.
4. Never invent section numbers, dates, case names, citations, FIR numbers, or prayer clauses.
5. Use formal Indian legal English appropriate for ${context.court}.
6. Follow the ${courtTemplate.format} format exactly.

─── VERIFIED FACTS ───
${JSON.stringify(verifiedFacts, null, 2)}

─── ASSUMPTIONS (mark clearly in draft) ───
${JSON.stringify(assumptions, null, 2)}

─── MISSING INFORMATION (use placeholders) ───
${gaps.join("\n")}

─── VERIFIED STATUTES (cite only these) ───
${JSON.stringify(stage4.statutes.map((s) => ({
  cite: `Section ${s.section} of the ${s.actName}`,
  text: s.text.slice(0, 500),
  source: s.sourceUrl,
})), null, 2)}

─── APPROVED AUTHORITIES (cite only these) ───
${JSON.stringify(stage6.includedAuthorities.map((a) => ({
  cite: `${a.caseTitle}${a.citation ? ` [${a.citation}]` : ""}`,
  holding: a.holding,
  relevance: a.relevanceNote,
  treatment: a.treatment,
})), null, 2)}

─── MATTER CONTEXT ───
Client: ${context.clientName}
Title: ${context.matterTitle}
Side: ${context.side}
Case type: ${context.caseType}
BNS applicable: ${stage3.bnsApplicable}
Transition analysis: ${stage3.transitionAnalysis ?? "Not applicable"}

─── REQUIRED FORMAT ───
${courtTemplate.instructions}

Generate the complete ${context.documentType} now. After the main document, add a section titled
"DRAFTING NOTES FOR COUNSEL" (outside the filing document) covering:
- Risks and gaps
- Alternative arguments considered
- Authorities considered but not included
- Issues requiring confirmation before filing

Return ONLY the draft text — no JSON wrapper.
`;

  const result = await model.generateContent(prompt);
  const fullText = result.response.text();

  // Split main draft from drafting notes
  const draftingNotesMatch = fullText.indexOf("DRAFTING NOTES FOR COUNSEL");
  const mainDraft = draftingNotesMatch > -1
    ? fullText.slice(0, draftingNotesMatch).trim()
    : fullText.trim();
  const draftingNotes = draftingNotesMatch > -1
    ? fullText.slice(draftingNotesMatch).trim()
    : "";

  // Parse into sections for the editor
  const sections = parseDraftIntoSections(mainDraft, stage4, stage6);

  // Identify missing placeholders
  const placeholderMatches = mainDraft.match(/\[INSERT:[^\]]+\]/g) ?? [];
  const missingPlaceholders = [...new Set(placeholderMatches)];

  return {
    draft: {
      courtHeading: courtTemplate.heading(context),
      causeTitle: `${context.clientName} vs. [Opposing Party]`,
      documentTitle: context.documentType.replace(/_/g, " ").toUpperCase(),
      sections,
      draftingNotes,
      missingPlaceholders,
    },
  };
}

function parseDraftIntoSections(
  text: string,
  stage4: Stage4Output,
  stage6: Stage6Output
): DraftSection[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const sections: DraftSection[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = /^[A-Z][A-Z\s]+:?$/.test(line.trim()) && line.trim().length < 60;
    const hasCitation = stage4.statutes.some((s) =>
      line.includes(s.actName) || line.includes(`Section ${s.section}`)
    ) || stage6.includedAuthorities.some((a) =>
      line.includes(a.caseTitle) || (a.citation && line.includes(a.citation))
    );

    const isPlaceholder = line.includes("[INSERT:");
    const isPrayer = /prayer|prays that|be pleased|it is prayed/i.test(line);
    const isVerification = /verif|solemnly affirm|deponent/i.test(line);

    const type: DraftSection["type"] = isHeading
      ? "heading"
      : isPrayer
      ? "prayer"
      : isVerification
      ? "verification"
      : isPlaceholder
      ? "placeholder"
      : "paragraph";

    const cites = stage4.statutes
      .filter((s) => line.includes(s.actName) && line.includes(s.section))
      .map((s) => `${s.actName} s.${s.section}`);

    sections.push({
      id: `section_${i}`,
      type,
      content: line,
      citations: cites,
      sourceRefs: [],
      assertionType: hasCitation ? "legal_proposition" : isPlaceholder ? "drafting_assumption" : "extracted_fact",
      confidence: isPlaceholder ? 0.3 : hasCitation ? 0.9 : 0.7,
    });
  }

  return sections;
}
