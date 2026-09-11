import { getFlashModel, uploadFileToGemini } from "../gemini";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/storage/r2";
import type { Stage1Output, ExtractedEntity } from "./types";

export async function runStage1(matterId: string): Promise<Stage1Output> {
  const documents = await prisma.document.findMany({ where: { matterId } });
  const results: Stage1Output["documents"] = [];

  for (const doc of documents) {
    try {
      // Download file from R2
      const downloadUrl = await getDownloadUrl(doc.storageKey);
      const response = await fetch(downloadUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      let ocrText = "";
      let geminiFileUri: string | undefined;
      let entities: ExtractedEntity[] = [];

      const isPdf = doc.mimeType === "application/pdf";
      const isImage = doc.mimeType.startsWith("image/");

      if (isPdf || isImage) {
        // Use Gemini Files API for vision-based OCR
        geminiFileUri = await uploadFileToGemini(buffer, doc.mimeType, doc.filename);

        const model = getFlashModel();
        const result = await model.generateContent([
          {
            fileData: { mimeType: doc.mimeType, fileUri: geminiFileUri },
          },
          {
            text: `You are a legal document OCR and entity extraction system for Indian courts.
Extract ALL text from this document verbatim, then extract named entities.

Return JSON with:
{
  "ocrText": "<full extracted text>",
  "pageCount": <number>,
  "entities": [
    {
      "type": "person|date|place|case_number|fir_number|section|act|court|police_station|prayer|other",
      "value": "<exact value>",
      "page": <page number if determinable>,
      "confidence": <0.0-1.0>
    }
  ]
}

Entity types to extract:
- person: accused, complainant, witnesses, advocates, judges
- date: incident dates, filing dates, order dates
- fir_number: FIR/complaint numbers
- case_number: court case numbers
- section: statutory sections (e.g., "Section 302 BNS", "Section 420 IPC")
- act: full act names
- court: court names and locations
- police_station: police station names
- prayer: specific reliefs sought
- place: locations, addresses`,
          },
        ]);

        const parsed = JSON.parse(result.response.text());
        ocrText = parsed.ocrText ?? "";
        entities = parsed.entities ?? [];

        // Update page count in DB
        if (parsed.pageCount) {
          await prisma.document.update({
            where: { id: doc.id },
            data: {
              pageCount: parsed.pageCount,
              geminiFileUri,
              ocrText,
              extractedEntities: entities,
            },
          });
        }
      } else if (doc.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        // DOCX: use mammoth
        const mammoth = await import("mammoth");
        const { value } = await mammoth.extractRawText({ buffer });
        ocrText = value;

        await prisma.document.update({
          where: { id: doc.id },
          data: { ocrText, geminiFileUri: null },
        });
      } else {
        ocrText = "[Unsupported file type — manual review required]";
      }

      results.push({
        documentId: doc.id,
        filename: doc.filename,
        ocrText,
        geminiFileUri,
        entities,
        pageCount: doc.pageCount ?? 1,
      });
    } catch (err) {
      console.error(`[Stage1] Error processing document ${doc.id}:`, err);
      results.push({
        documentId: doc.id,
        filename: doc.filename,
        ocrText: "[OCR failed — please review manually]",
        entities: [],
        pageCount: 1,
      });
    }
  }

  return { documents: results };
}
