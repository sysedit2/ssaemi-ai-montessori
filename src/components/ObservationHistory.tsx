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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {entries.map((entry) => {
          const areas = entry.structured_payload.area_engagement;
          const avgScore = (
            Object.values(areas).reduce((s, a) => s + a.score, 0) / 5
          ).toFixed(1);
          const date = new Date(entry.observed_at).toLocaleDateString("ko-KR", {
            year: "numeric", month: "long", day: "numeric",
          });
          const isExpanded = expandedId === entry.id;

          return (
            <div key={entry.id} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* 헤더 행 */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800">{date}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      평균 {avgScore}/5
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mt-1.5">
                    {Object.entries(areas).map(([k, v]) => (
                      <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {AREA_LABELS[k]} {v.score}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {/* 대시보드 불러오기 */}
                  <button
                    onClick={() => onSelect(entry)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition whitespace-nowrap"
                  >
                    대시보드
                  </button>
                  {/* 관찰일지 원문 토글 */}
                  {entry.journal_text && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 font-medium transition whitespace-nowrap"
                    >
                      {isExpanded ? "닫기 ▲" : "일지 보기 ▼"}
                    </button>
                  )}
                </div>
              </div>

              {/* 관찰일지 원문 패널 */}
              {isExpanded && entry.journal_text && (
                <div className="border-t border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      📋 관찰일지 원문
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(entry.journal_text!);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 transition"
                    >
                      복사
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg px-3 py-3 border border-slate-100 max-h-48 overflow-y-auto">
                    {entry.journal_text}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 text-right">
                    {entry.journal_text.length}자 · {date}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
