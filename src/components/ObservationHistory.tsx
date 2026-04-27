"use client";

import { useEffect, useState } from "react";
import { getObservations, type ObservationEntry } from "@/lib/local-store";

interface Props {
  childId: string | null;
  onSelect: (entry: ObservationEntry) => void;
}

const AREA_LABELS: Record<string, string> = {
  practical_life: "실용", sensorial: "감각", language: "언어",
  mathematics: "수학", cultural: "문화",
};

export default function ObservationHistory({ childId, onSelect }: Props) {
  const [entries, setEntries] = useState<ObservationEntry[]>([]);

  useEffect(() => {
    if (!childId) { setEntries([]); return; }
    setEntries(getObservations(childId));
  }, [childId]);

  if (!childId || entries.length === 0) {
    return childId ? (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center text-xs text-slate-400 py-8">
        관찰 기록이 없습니다.<br />분석 후 저장하면 여기에 표시됩니다.
      </div>
    ) : null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">관찰 이력 ({entries.length}건)</h3>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {entries.map((entry) => {
          const areas = entry.structured_payload.area_engagement;
          const avgScore = (
            Object.values(areas).reduce((s, a) => s + a.score, 0) / 5
          ).toFixed(1);
          const date = new Date(entry.observed_at).toLocaleDateString("ko-KR", {
            month: "long", day: "numeric",
          });

          return (
            <button
              key={entry.id}
              onClick={() => onSelect(entry)}
              className="w-full text-left border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 rounded-xl px-4 py-3 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{date}</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  평균 {avgScore}/5
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(areas).map(([k, v]) => (
                  <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {AREA_LABELS[k]} {v.score}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
