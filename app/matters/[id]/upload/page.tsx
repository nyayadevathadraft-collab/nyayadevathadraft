"use client";

import { useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Upload, FileText, X, Loader2, Play, PenLine } from "lucide-react";
import { PipelineProgress } from "@/components/pipeline/progress-tracker";
import { ManualEntryForm } from "@/components/upload/manual-entry";

const ALLOWED_EXTS = ["pdf", "docx", "jpg", "jpeg", "png", "tiff", "tif", "webp"];

interface UploadedFile {
  file: File;
  id?: string;
}

type Tab = "upload" | "manual";

export default function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matterId } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upload");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [starting, setStarting] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  function addFiles(incoming: File[]) {
    const valid = incoming.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return ALLOWED_EXTS.includes(ext) && f.size <= 50 * 1024 * 1024;
    });
    setFiles((prev) => [...prev, ...valid.map((file) => ({ file }))]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("matterId", matterId);
      files.forEach(({ file }) => formData.append("files", file));

      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      setUploaded(true);
      toast.success(`${files.length} document${files.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function startAnalysis() {
    setStarting(true);
    try {
      const res = await fetch(`/api/pipeline/${matterId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "1" }),
      });
      if (!res.ok) throw new Error("Could not start pipeline");
      toast.success("AI analysis started — this may take 1-3 minutes");
      router.push(`/matters/${matterId}/authorities`);
    } catch {
      toast.error("Failed to start analysis.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Add Case Information</h1>
        <p className="text-sm text-gray-500 mb-6">
          Upload existing documents or enter case details manually — the AI pipeline works either way.
        </p>

        {/* Pipeline progress (realtime via Supabase) */}
        <PipelineProgress matterId={matterId} />

        {/* Top-level tab bar */}
        <div className="flex gap-1 border-b border-gray-200 mb-8">
          <TabButton
            active={tab === "upload"}
            onClick={() => setTab("upload")}
            icon={<Upload className="w-4 h-4" />}
            label="Upload Documents"
          />
          <TabButton
            active={tab === "manual"}
            onClick={() => setTab("manual")}
            icon={<PenLine className="w-4 h-4" />}
            label="Enter Details Manually"
          />
        </div>

        {/* Upload tab */}
        {tab === "upload" && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Upload FIR, charge sheets, prior orders, notices, pleadings, contracts, or any case documents.
              Supported: PDF, DOCX, JPG, PNG, TIFF (up to 50 MB each).
            </p>

            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors mb-4"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Drag & drop files here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, JPG, PNG, TIFF · Max 50 MB each</p>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.docx,.jpg,.jpeg,.png,.tiff,.tif,.webp"
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2 mb-6">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-800 flex-1 truncate">{f.file.name}</span>
                    <span className="text-xs text-gray-400">{(f.file.size / 1024 / 1024).toFixed(1)} MB</span>
                    {!uploaded && (
                      <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              {!uploaded && (
                <button
                  onClick={handleUpload}
                  disabled={files.length === 0 || uploading}
                  className="flex items-center gap-2 bg-blue-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Uploading…" : "Upload Documents"}
                </button>
              )}

              {uploaded && (
                <button
                  onClick={startAnalysis}
                  disabled={starting}
                  className="flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {starting ? "Starting…" : "Start AI Analysis"}
                </button>
              )}
            </div>

            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Privacy notice:</strong> Uploaded documents are encrypted at rest and in transit.
              They are used only for generating your draft and are never used to train AI models.
              Sensitive data (Aadhaar, PAN, minors) will require explicit confirmation before inclusion.
            </div>
          </div>
        )}

        {/* Manual entry tab */}
        {tab === "manual" && (
          <ManualEntryForm matterId={matterId} />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-blue-900 text-blue-900"
          : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
