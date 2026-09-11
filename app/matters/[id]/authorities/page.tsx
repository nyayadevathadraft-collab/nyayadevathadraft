"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { MatterNav } from "@/components/matters/matter-nav";
import {
  CheckCircle,
  XCircle,
  BookOpen,
  ExternalLink,
  Loader2,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Authority {
  id: string;
  similarityScore: number | null;
  relevanceNote: string | null;
  selection: string;
  authority: {
    id: string;
    caseTitle: string;
    citation: string | null;
    court: string;
    judgmentDate: string | null;
    holding: string;
    treatment: string;
    sourceUrl: string;
    verified: boolean;
  };
}

const TREATMENT_BADGE: Record<string, string> = {
  binding: "bg-green-100 text-green-800",
  persuasive: "bg-blue-100 text-blue-800",
  overruled: "bg-red-100 text-red-800",
  analogous: "bg-gray-100 text-gray-700",
};

export default function AuthoritiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matterId } = use(params);
  const router = useRouter();
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch(`/api/authorities/${matterId}`)
      .then((r) => r.json())
      .then(({ authorities }) => setAuthorities(authorities ?? []))
      .finally(() => setLoading(false));
  }, [matterId]);

  async function select(maId: string, authorityId: string, selection: string) {
    setSaving(maId);
    try {
      const res = await fetch(`/api/authorities/${matterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorityId, selection }),
      });
      if (!res.ok) throw new Error();
      setAuthorities((prev) =>
        prev.map((a) => a.id === maId ? { ...a, selection } : a)
      );
    } catch {
      toast.error("Could not save selection");
    } finally {
      setSaving(null);
    }
  }

  async function generateDraft() {
    setStarting(true);
    try {
      const res = await fetch(`/api/pipeline/${matterId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "2" }),
      });
      if (!res.ok) throw new Error("Could not start draft generation");
      toast.success("Draft generation started — redirecting…");
      router.push(`/matters/${matterId}/draft`);
    } catch {
      toast.error("Failed to start draft generation.");
    } finally {
      setStarting(false);
    }
  }

  const includedCount = authorities.filter((a) => a.selection === "included").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <MatterNav matterId={matterId} active="authorities" />

        <div className="flex items-center justify-between mb-6 mt-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suggested Authorities</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and select which precedents to include in your draft.
              {includedCount > 0 && <strong className="text-blue-700"> {includedCount} included.</strong>}
            </p>
          </div>
          <button
            onClick={generateDraft}
            disabled={starting || authorities.every((a) => a.selection === "pending")}
            className="flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Generate Draft
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
          <strong>Important:</strong> Only include authorities whose legal proposition and factual/procedural context
          support their use in this matter. The draft will cite only included authorities.
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading suggested authorities…
          </div>
        ) : authorities.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No authorities found yet. Run AI analysis first.
          </div>
        ) : (
          <div className="space-y-4">
            {authorities.map((ma) => (
              <div
                key={ma.id}
                className={cn(
                  "bg-white border rounded-xl p-5 transition-all",
                  ma.selection === "included" && "border-green-300 bg-green-50/30",
                  ma.selection === "excluded" && "border-gray-200 opacity-60",
                  ma.selection === "research_only" && "border-amber-200 bg-amber-50/20",
                  ma.selection === "pending" && "border-gray-200"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{ma.authority.caseTitle}</h3>
                      {ma.authority.citation && (
                        <span className="text-xs text-gray-500">[{ma.authority.citation}]</span>
                      )}
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", TREATMENT_BADGE[ma.authority.treatment] ?? "bg-gray-100 text-gray-700")}>
                        {ma.authority.treatment}
                      </span>
                      {ma.authority.verified && (
                        <span className="text-xs text-green-600 flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {ma.authority.court}
                      {ma.authority.judgmentDate && ` · ${new Date(ma.authority.judgmentDate).getFullYear()}`}
                    </p>
                    <p className="text-sm text-gray-800 mb-2">{ma.authority.holding}</p>
                    {ma.relevanceNote && (
                      <p className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                        <strong>Why relevant:</strong> {ma.relevanceNote}
                      </p>
                    )}
                    {ma.similarityScore != null && (
                      <p className="text-xs text-gray-400 mt-2">
                        Similarity score: {Math.round(ma.similarityScore * 100)}%
                      </p>
                    )}
                  </div>
                  <a
                    href={ma.authority.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="flex gap-2 mt-4">
                  {[
                    { value: "included", label: "Include", icon: CheckCircle, color: "bg-green-100 text-green-800 hover:bg-green-200" },
                    { value: "excluded", label: "Exclude", icon: XCircle, color: "bg-red-50 text-red-700 hover:bg-red-100" },
                    { value: "research_only", label: "Research Only", icon: BookOpen, color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
                  ].map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      onClick={() => select(ma.id, ma.authority.id, value)}
                      disabled={saving === ma.id}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                        ma.selection === value
                          ? `${color} border-current font-bold`
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {saving === ma.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
