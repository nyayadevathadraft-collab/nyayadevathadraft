import { getFlashModel } from "../gemini";
import { prisma } from "@/lib/prisma";
import type { Stage1Output, ExtractedEntity } from "./types";

export interface PartyEntry {
  name: string;
  role: string;
  address?: string;
  contact?: string;
}

export interface ChronologyEntry {
  date?: string;
  event: string;
}

export interface StructuredInput {
  parties: PartyEntry[];
  chronology: ChronologyEntry[];
  firNumber?: string;
  caseNumber?: string;
  policeStation?: string;
  dateOfIncident?: string;
  sectionsInvolved?: string;
  priorProceedings?: string;
  reliefSought?: string;
  additionalContext?: string;
}

export interface ManualEntryInput {
  mode: "freetext" | "structured" | "both";
  freeText?: string;
  structured?: StructuredInput;
}

/**
 * Stage 1 alternative: process user-typed input instead of uploaded documents.
 * Gemini Flash normalises free text into entities + facts.
 * Structured fields are converted directly into entities.
 * Creates a synthetic "document" record so the rest of the pipeline works unchanged.
 */
export async function runStage1Manual(
  matterId: string,
  tenantId: string,
  input: ManualEntryInput
): Promise<Stage1Output> {
  // Build combined text from whatever the user provided
  const combinedText = buildCombinedText(input);

  const model = getFlashModel();
  const result = await model.generateContent(`
You are a legal document entity extraction system for Indian courts.
The following text was typed by an advocate describing their client's matter.
Extract all entities and normalise the information.

Text:
${combinedText}

Return JSON:
{
  "ocrText": "${combinedText.replace(/"/g, '\\"').replace(/\n/g, "\\n")}",
  "pageCount": 1,
  "entities": [
    {
      "type": "person|date|place|case_number|fir_number|section|act|court|police_station|prayer|other",
      "value": "<exact value>",
      "page": 1,
      "confidence": <0.9 for explicitly stated, 0.7 for inferred>
    }
  ]
}

Extract every person, date, FIR/case number, section, act, court, police station, address, and prayer clause mentioned.
Mark confidence 0.9 for explicitly stated facts, 0.7 for inferred ones.
`);

  const parsed = JSON.parse(result.response.text());
  const entities: ExtractedEntity[] = parsed.entities ?? [];

  // Also extract entities from structured fields directly (high confidence — user typed them)
  if (input.structured) {
    const s = input.structured;

    s.parties.forEach((p) => {
      entities.push({ type: "person", value: `${p.role}: ${p.name}`, confidence: 1.0 });
      if (p.address) entities.push({ type: "place", value: p.address, confidence: 1.0 });
    });

    s.chronology.forEach((c) => {
      if (c.date) entities.push({ type: "date", value: c.date, confidence: 1.0 });
    });

    if (s.firNumber) entities.push({ type: "fir_number", value: s.firNumber, confidence: 1.0 });
    if (s.caseNumber) entities.push({ type: "case_number", value: s.caseNumber, confidence: 1.0 });
    if (s.policeStation) entities.push({ type: "police_station", value: s.policeStation, confidence: 1.0 });
    if (s.dateOfIncident) entities.push({ type: "date", value: s.dateOfIncident, confidence: 1.0 });
    if (s.reliefSought) entities.push({ type: "prayer", value: s.reliefSought, confidence: 1.0 });

    if (s.sectionsInvolved) {
      // Split on commas or "and"
      const sections = s.sectionsInvolved.split(/,|and/i).map((s) => s.trim()).filter(Boolean);
      sections.forEach((sec) => {
        entities.push({ type: "section", value: sec, confidence: 1.0 });
      });
    }
  }

  // Save a synthetic document record so the rest of the pipeline (which queries documents) still works
  const syntheticDoc = await prisma.document.upsert({
    where: {
      // We use a stable key based on matterId for the synthetic doc
      id: await getOrCreateSyntheticDocId(matterId),
    },
    update: {
      ocrText: combinedText,
      extractedEntities: entities as unknown as Record<string, unknown>[],
    },
    create: {
      matterId,
      tenantId,
      filename: "Manual Entry",
      storageKey: `manual/${matterId}/entry`,
      mimeType: "text/plain",
      pageCount: 1,
      ocrText: combinedText,
      extractedEntities: entities as unknown as Record<string, unknown>[],
      contentHash: Buffer.from(combinedText).toString("base64").slice(0, 64),
    },
  });

  return {
    documents: [
      {
        documentId: syntheticDoc.id,
        filename: "Manual Entry",
        ocrText: combinedText,
        entities,
        pageCount: 1,
      },
    ],
  };
}

function buildCombinedText(input: ManualEntryInput): string {
  const parts: string[] = [];

  if (input.freeText?.trim()) {
    parts.push("=== Advocate's Description ===\n" + input.freeText.trim());
  }

  if (input.structured) {
    const s = input.structured;
    const structuredParts: string[] = [];

    if (s.parties.length > 0) {
      structuredParts.push(
        "Parties:\n" +
          s.parties
            .map((p) => `- ${p.role}: ${p.name}${p.address ? `, ${p.address}` : ""}`)
            .join("\n")
      );
    }

    if (s.firNumber) structuredParts.push(`FIR Number: ${s.firNumber}`);
    if (s.caseNumber) structuredParts.push(`Case Number: ${s.caseNumber}`);
    if (s.policeStation) structuredParts.push(`Police Station: ${s.policeStation}`);
    if (s.dateOfIncident) structuredParts.push(`Date of Incident: ${s.dateOfIncident}`);

    if (s.chronology.length > 0) {
      structuredParts.push(
        "Chronology of Events:\n" +
          s.chronology
            .map((c) => `- ${c.date ? `[${c.date}] ` : ""}${c.event}`)
            .join("\n")
      );
    }

    if (s.sectionsInvolved) structuredParts.push(`Sections/Acts Involved: ${s.sectionsInvolved}`);
    if (s.priorProceedings) structuredParts.push(`Prior Proceedings: ${s.priorProceedings}`);
    if (s.reliefSought) structuredParts.push(`Relief Sought: ${s.reliefSought}`);
    if (s.additionalContext) structuredParts.push(`Additional Context: ${s.additionalContext}`);

    if (structuredParts.length > 0) {
      parts.push("=== Structured Details ===\n" + structuredParts.join("\n\n"));
    }
  }

  return parts.join("\n\n");
}

async function getOrCreateSyntheticDocId(matterId: string): Promise<string> {
  const existing = await prisma.document.findFirst({
    where: { matterId, filename: "Manual Entry" },
    select: { id: true },
  });
  if (existing) return existing.id;
  // Return a placeholder — the upsert's create branch will handle it
  return "00000000-0000-0000-0000-000000000000";
}
