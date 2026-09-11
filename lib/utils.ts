import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function bytesToMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export function pipelineStageName(stage: number): string {
  const names: Record<number, string> = {
    0: "Waiting",
    1: "OCR & Extraction",
    2: "Fact Analysis",
    3: "Issue Identification",
    4: "Statute Retrieval",
    5: "Case-law Research",
    6: "Authority Selection",
    7: "Draft Generation",
    8: "Validation Complete",
  };
  return names[stage] ?? "Unknown";
}
