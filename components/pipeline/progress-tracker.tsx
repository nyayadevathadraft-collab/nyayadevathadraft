"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pipelineStageName } from "@/lib/utils";
import { CheckCircle, Circle, Loader2, AlertCircle } from "lucide-react";

interface Props {
  matterId: string;
}

const TOTAL_STAGES = 8;

export function PipelineProgress({ matterId }: Props) {
  const [stage, setStage] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    fetch(`/api/matters/${matterId}`)
      .then((r) => r.json())
      .then(({ matter }) => {
        setStage(matter.pipelineStage);
        setStatus(matter.status);
        setError(matter.pipelineError);
      });

    // Supabase Realtime subscription — listen for pipeline_stage changes
    const channel = supabase
      .channel(`matter_${matterId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matters",
          filter: `id=eq.${matterId}`,
        },
        (payload) => {
          const m = payload.new as { pipeline_stage: number; status: string; pipeline_error: string | null };
          setStage(m.pipeline_stage);
          setStatus(m.status);
          setError(m.pipeline_error);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matterId]);

  if (stage === null) return null;
  if (stage === 0) return null; // Not started yet

  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">AI Analysis Progress</h3>
        {error && (
          <span className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5" />
            Error at stage {stage}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {Array.from({ length: TOTAL_STAGES }, (_, i) => i + 1).map((s) => {
          const isDone = s < stage;
          const isRunning = s === stage && status === "processing";
          const isError = s === stage && !!error;
          const isPending = s > stage;

          return (
            <div key={s} className="flex items-center gap-3">
              <div className="w-5 h-5 flex-shrink-0">
                {isDone && <CheckCircle className="w-5 h-5 text-green-500" />}
                {isRunning && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                {isError && <AlertCircle className="w-5 h-5 text-red-500" />}
                {isPending && <Circle className="w-5 h-5 text-gray-200" />}
                {s === stage && status === "awaiting_selection" && (
                  <CheckCircle className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <span className={`text-sm ${isDone ? "text-gray-500" : isRunning ? "text-blue-700 font-medium" : "text-gray-400"}`}>
                {pipelineStageName(s)}
              </span>
            </div>
          );
        })}
      </div>

      {status === "awaiting_selection" && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          Research complete. Please review and select authorities on the Authorities tab before generating the draft.
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
