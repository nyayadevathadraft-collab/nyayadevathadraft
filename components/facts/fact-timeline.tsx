"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { scalePoint } from "d3-scale";
import { cn } from "@/lib/utils";

export type FactStatus = "confirmed" | "assumption" | "gap" | "user_provided";

export interface TimelineFact {
  id: string;
  text: string;
  status: FactStatus;
  confidence: number;
  sourcePage?: number | null;
}

const STATUS_COLOR: Record<FactStatus, string> = {
  confirmed: "#16a34a",
  assumption: "#d97706",
  gap: "#dc2626",
  user_provided: "#2563eb",
};

const STATUS_LABEL: Record<FactStatus, string> = {
  confirmed: "Confirmed",
  assumption: "Assumption",
  gap: "Missing",
  user_provided: "User Provided",
};

const HEIGHT = 120;
const NODE_RADIUS = 7;
const MARGIN_X = 32;

/**
 * Ordinal chronology view — facts don't carry a structured event date yet
 * (only `createdAt`, the extraction timestamp), so nodes are laid out in
 * sequence order rather than on a real time scale.
 */
export function FactTimeline({ facts }: { facts: TimelineFact[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const xScale = useMemo(
    () =>
      scalePoint()
        .domain(facts.map((f) => f.id))
        .range([MARGIN_X, Math.max(width - MARGIN_X, MARGIN_X)])
        .padding(1),
    [facts, width]
  );

  const hovered = facts.find((f) => f.id === hoveredId);
  const hoveredX = hovered ? xScale(hovered.id) ?? 0 : 0;
  const tooltipWidth = 260;
  const tooltipLeft = Math.min(Math.max(hoveredX - tooltipWidth / 2, 0), Math.max(width - tooltipWidth, 0));

  if (facts.length === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <svg width={width || undefined} height={HEIGHT} className="w-full overflow-visible">
        {width > 0 && (
          <>
            <line
              x1={MARGIN_X}
              x2={width - MARGIN_X}
              y1={HEIGHT / 2}
              y2={HEIGHT / 2}
              stroke="#e5e7eb"
              strokeWidth={2}
            />
            {facts.map((f, i) => {
              const x = xScale(f.id) ?? 0;
              const y = HEIGHT / 2;
              const isHovered = hoveredId === f.id;
              const labelAbove = i % 2 === 0;
              return (
                <g
                  key={f.id}
                  onMouseEnter={() => setHoveredId(f.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? NODE_RADIUS + 2 : NODE_RADIUS}
                    fill={STATUS_COLOR[f.status]}
                    fillOpacity={0.25 + f.confidence * 0.75}
                    stroke={STATUS_COLOR[f.status]}
                    strokeWidth={2}
                    className="transition-[r] duration-100"
                  />
                  <text
                    x={x}
                    y={labelAbove ? y - 16 : y + 26}
                    textAnchor="middle"
                    className={cn("text-[10px] fill-gray-400", isHovered && "fill-gray-700 font-medium")}
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="absolute top-0 z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg pointer-events-none"
          style={{ left: tooltipLeft, width: tooltipWidth }}
        >
          <p className="text-xs text-gray-900 leading-snug">{hovered.text}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[hovered.status] }}
            />
            {STATUS_LABEL[hovered.status]} · {Math.round(hovered.confidence * 100)}% confidence
            {hovered.sourcePage ? ` · p.${hovered.sourcePage}` : ""}
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {(Object.keys(STATUS_LABEL) as FactStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[status] }}
            />
            {STATUS_LABEL[status]}
          </div>
        ))}
      </div>
    </div>
  );
}
