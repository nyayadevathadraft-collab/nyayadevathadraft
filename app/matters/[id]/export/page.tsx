"use client";

import { use, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MatterNav } from "@/components/matters/matter-nav";
import { Download, FileText, Loader2 } from "lucide-react";

interface Draft { id: string; version: number; documentType: string; status: string; createdAt: string; }

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matterId } = use(params);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/drafts/${matterId}`)
      .then((r) => r.json())
      .then(({ drafts }) => setDrafts(drafts ?? []))
      .finally(() => setLoading(false));
  }, [matterId]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <MatterNav matterId={matterId} active="export" />
        <div className="mt-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Export Centre</h1>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading drafts…
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-gray-500 py-8 text-sm">No drafts available yet.</div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div key={draft.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{draft.documentType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-500">
                          Version {draft.version} · {draft.status} · {new Date(draft.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <a
                      href={`/api/export/${draft.id}?format=docx`}
                      download
                      className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      DOCX
                    </a>
                    <a
                      href={`/api/export/${draft.id}?format=pdf`}
                      download
                      className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong>Reminder:</strong> AI-generated drafts must be verified by a qualified Indian advocate
            before filing. Check all citations, facts, limitation periods, and court rules independently.
          </div>
        </div>
      </main>
    </div>
  );
}
