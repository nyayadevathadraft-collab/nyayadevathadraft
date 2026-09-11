import { getFlashModel } from "../gemini";
import type { Stage1Output, Stage2Output, FactItem } from "./types";

export async function runStage2(stage1: Stage1Output, context: {
  caseType: string;
  side: string;
  documentType: string;
}): Promise<Stage2Output> {
  const combinedText = stage1.documents
    .map((d) => `=== ${d.filename} ===\n${d.ocrText}`)
    .join("\n\n");

  const allEntities = stage1.documents.flatMap((d) =>
    d.entities.map((e) => ({ ...e, sourceDocId: d.documentId }))
  );

  const model = getFlashModel();
  const result = await model.generateContent(`
You are a legal fact analyst for Indian courts. Analyse the extracted text and entities below.

Case context:
- Case type: ${context.caseType}
- Side: ${context.side}
- Document requested: ${context.documentType}

Extracted entities: ${JSON.stringify(allEntities, null, 2)}

Document text:
${combinedText.slice(0, 50000)}

Return JSON with:
{
  "facts": [
    {
      "text": "<clear factual statement>",
      "category": "chronology|party|evidence|allegation|prayer|procedural|other",
      "sourceDocId": "<documentId or null>",
      "sourcePage": <page number or null>,
      "confidence": <0.0-1.0>,
      "status": "confirmed|assumption|gap|user_provided"
    }
  ],
  "timeline": [
    { "date": "<ISO date or null>", "event": "<description>", "sourceDocId": "<id or null>" }
  ],
  "missingFacts": ["<description of missing information needed>"],
  "contradictions": [
    { "description": "<what conflicts>", "factIds": [] }
  ]
}

Rules:
- "confirmed": directly stated in source documents
- "assumption": inferred but not explicitly stated — mark clearly
- "gap": required information that is absent
- Never invent dates, names, FIR numbers, or case numbers
- Flag missing information rather than guessing
`);

  const parsed = JSON.parse(result.response.text()) as Stage2Output;
  return parsed;
}
