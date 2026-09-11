import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("[Gemini] GEMINI_API_KEY not set — AI features will fail.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

/** Fast model for extraction, classification, and validation */
export function getFlashModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    safetySettings: SAFETY,
    generationConfig: { responseMimeType: "application/json" },
  });
}

/** Pro model for legal reasoning and draft generation */
export function getProModel() {
  return genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    safetySettings: SAFETY,
    generationConfig: { responseMimeType: "application/json" },
  });
}

/** Pro model with plain text output for final draft content */
export function getProModelText() {
  return genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    safetySettings: SAFETY,
  });
}

/** Embedding model for semantic search */
export async function embedText(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/** Upload a file to Gemini Files API (for OCR) */
export async function uploadFileToGemini(
  fileBuffer: Buffer,
  mimeType: string,
  displayName: string
): Promise<string> {
  const { GoogleAIFileManager } = await import("@google/generative-ai/server");
  const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

  const uploadResult = await fileManager.uploadFile(
    // Write to a temp path so the SDK can read it
    await writeTempFile(fileBuffer, displayName),
    { mimeType, displayName }
  );
  return uploadResult.file.uri;
}

async function writeTempFile(buffer: Buffer, name: string): Promise<string> {
  const { writeFile } = await import("fs/promises");
  const { join } = await import("path");
  const { tmpdir } = await import("os");
  const path = join(tmpdir(), `nyaya_${Date.now()}_${name}`);
  await writeFile(path, buffer);
  return path;
}
