"use client";

import { use, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MatterNav } from "@/components/matters/matter-nav";
import { Loader2, AlertCircle, AlertTriangle, Info, CheckCircle, Download } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ReviewFlag {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
  location?: string;
}

interface Draft {
  id: string;
  version: number;
  status: string;
  reviewFlags: ReviewFlag[];
}

const SEVERITY_CONFIG = {
  error: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
};

export default function ReviewDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matterId } = use(params);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/drafts/${matterId}`)
      .then((r) => r.json())
      .then(({ drafts }) => setDraft(drafts?.[0] ?? null))
      .finally(() => setLoading(false));
  }, [matterId]);

  const errors = (draft?.reviewFlags ?? []).filter((f) => f.severity === "error");
  const warnings = (draft?.reviewFlags ?? []).filter((f) => f.severity === "warning");
  const infos = (draft?.reviewFlags ?? []).filter((f) => f.severity === "info");
  const canExport = errors.length === 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <MatterNav matterId={matterId} active="review" />

        <div className="mt-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Pre-Filing Review</h1>
          <p className="text-sm text-gray-500 mb-6">
            Review all flags before exporting. Errors must be resolved; warnings require advocate confirmation.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading review…
            </div>
          ) : !draft ? (
            <div className="text-gray-500 py-8 text-sm">No draft found. Generate a draft first.</div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={cn("rounded-xl border p-4 text-center", errors.length > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
                  <p className="text-2xl font-bold">{errors.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Errors</p>
                </div>
                <div className={cn("rounded-xl border p-4 text-center", warnings.length > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200")}>
                  <p className="text-2xl font-bold">{warnings.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Warnings</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                  <p className="text-2xl font-bold">{infos.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Info</p>
                </div>
              </div>

              {/* Flags */}
              {[...errors, ...warnings, ...infos].map((flag, i) => {
                const cfg = SEVERITY_CONFIG[flag.severity];
                const Icon = cfg.icon;
                return (
                  <div key={i} className={cn("flex gap-3 p-4 rounded-lg border mb-3", cfg.bg)}>
                    <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", cfg.color)} />
                    <div>
                      <p className={cn("text-sm font-medium", cfg.color)}>{flag.message}</p>
                      {flag.location && (
                        <p className="text-xs text-gray-500 mt-0.5">Location: {flag.location}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {(draft.reviewFlags ?? []).length === 0 && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">No issues found. Ready to export.</span>
                </div>
              )}

              {/* Export */}
              <div className="mt-8 p-5 bg-white border border-gray-200 rounded-xl">
                <h2 className="font-semibold text-gray-900 mb-4">Export Draft</h2>
                {!canExport && (
                  <p className="text-sm text-red-600 mb-3">
                    Resolve all errors before exporting.
                  </p>
                )}
                <div className="flex gap-3">
                  <a
                    href={canExport ? `/api/export/${draft.id}?format=docx` : "#"}
                    download
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      canExport
                        ? "bg-blue-900 text-white hover:bg-blue-800"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    <Download className="w-4 h-4" />
                    Download DOCX
                  </a>
                  <a
                    href={canExport ? `/api/export/${draft.id}?format=pdf` : "#"}
                    download
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border",
                      canExport
                        ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                        : "border-gray-200 text-gray-400 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  AI-generated draft. Verify all facts, law, and citations with a qualified advocate before filing.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
