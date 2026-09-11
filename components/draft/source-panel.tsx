"use client";

import { useEffect, useState } from "react";
import { BookOpen, AlertTriangle, ExternalLink } from "lucide-react";

interface Props {
  matterId: string;
  draftingNotes: string | null;
}

interface Authority {
  authority: {
    caseTitle: string;
    citation: string | null;
    court: string;
    sourceUrl: string;
  };
  selection: string;
}

export function SourcePanel({ matterId, draftingNotes }: Props) {
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [activeTab, setActiveTab] = useState<"authorities" | "notes">("authorities");

  useEffect(() => {
    fetch(`/api/authorities/${matterId}`)
      .then((r) => r.json())
      .then(({ authorities }) =>
        setAuthorities((authorities ?? []).filter((a: Authority) => a.selection === "included"))
      );
  }, [matterId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("authorities")}
          className={`flex-1 py-3 text-xs font-medium ${activeTab === "authorities" ? "border-b-2 border-blue-600 text-blue-700" : "text-gray-500"}`}
        >
          Authorities ({authorities.length})
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex-1 py-3 text-xs font-medium ${activeTab === "notes" ? "border-b-2 border-blue-600 text-blue-700" : "text-gray-500"}`}
        >
          Counsel Notes
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === "authorities" ? (
          <div className="space-y-3">
            {authorities.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No authorities included yet</p>
            )}
            {authorities.map((ma, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{ma.authority.caseTitle}</p>
                    {ma.authority.citation && (
                      <p className="text-xs text-gray-500">{ma.authority.citation}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{ma.authority.court}</p>
                  </div>
                  <a href={ma.authority.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {draftingNotes ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-800">Drafting Notes for Counsel</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{draftingNotes}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-4 text-gray-400">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs">No drafting notes available</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
