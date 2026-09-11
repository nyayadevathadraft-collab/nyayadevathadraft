"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { MatterNav } from "@/components/matters/matter-nav";
import { LegalEditor } from "@/components/draft/editor";
import { SourcePanel } from "@/components/draft/source-panel";
import { PipelineProgress } from "@/components/pipeline/progress-tracker";
import { Loader2, Save, Download } from "lucide-react";
import Link from "next/link";

interface Draft {
  id: string;
  version: number;
  status: string;
  content: {
    courtHeading: string;
    documentTitle: string;
    sections: { id: string; type: string; content: string; assertionType: string; confidence: number }[];
  };
  draftingNotes: string | null;
  reviewFlags: unknown[];
}

export default function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matterId } = use(params);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState("");

  useEffect(() => {
    fetch(`/api/drafts/${matterId}`)
      .then((r) => r.json())
      .then(({ drafts }) => {
        if (drafts && drafts.length > 0) {
          const latest = drafts[0];
          setDraft(latest);
          setContent(
            latest.content.sections?.map((s: { content: string }) => s.content).join("\n\n") ?? ""
          );
        }
      })
      .finally(() => setLoading(false));
  }, [matterId]);

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/drafts/${matterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, contentText: content }),
      });
      if (!res.ok) throw new Error();
      toast.success("Draft saved (new version created)");
      const { draft: newDraft } = await res.json();
      setDraft(newDraft);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-4 border-b border-gray-200 bg-white">
          <MatterNav matterId={matterId} active="draft" />
        </div>

        <div className="p-6 border-b border-gray-100 bg-white flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Drafting Workspace</h1>
            {draft && (
              <p className="text-xs text-gray-500 mt-0.5">
                {draft.content.documentTitle} · Version {draft.version} · {draft.status}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {draft && (
              <Link
                href={`/matters/${matterId}/review-draft`}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Review & Export
              </Link>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !draft}
              className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>

        {/* Disclaimer banner */}
        <div className="px-8 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700 font-medium text-center">
          AI-generated draft — Verify all facts, law, limitation, jurisdiction, court rules and citations with a qualified Indian advocate before filing.
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500 text-sm">Loading draft…</span>
          </div>
        ) : !draft ? (
          <div className="flex-1 p-8">
            <PipelineProgress matterId={matterId} />
            <div className="text-center py-16 text-gray-500">
              <p className="text-sm mb-2">Draft not ready yet.</p>
              <p className="text-xs text-gray-400">Complete authority selection and run draft generation first.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Editor */}
            <div className="flex-1 overflow-auto bg-white border-r border-gray-200">
              <LegalEditor
                content={draft.content.sections?.map((s) => s.content).join("\n\n") ?? ""}
                onChange={setContent}
              />
            </div>

            {/* Source panel */}
            <div className="w-80 flex flex-col overflow-hidden bg-gray-50 border-l border-gray-200">
              <SourcePanel
                matterId={matterId}
                draftingNotes={draft.draftingNotes}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
