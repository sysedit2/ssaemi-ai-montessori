"use client";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LineChart, Line, Legend,
} from "recharts";
import type { ObservationResult } from "@/lib/observation-schema";

type AgeGroup = "3-6" | "6-9" | "9-12";

interface HistoricalEntry {
  observed_at: string;
  structured_payload: ObservationResult;
}

interface Props {
  current: ObservationResult;
  ageGroup: AgeGroup;
  history?: HistoricalEntry[];
  onExportPDF?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  saveSuccess?: boolean;
}

const AREA_LABELS: Record<string, string> = {
  practical_life: "실용 생활",
  sensorial: "감각",
  language: "언어",
  mathematics: "수학",
  cultural: "문화",
};

const SCALE_LABELS: Record<string, string> = {
  autonomy_initiative: "자율성",
  concentration_sustainability: "집중 지속",
  repetition_consolidation: "반복 공고화",
  error_self_correction: "오류 수정",
  grace_courtesy: "예절",
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "bg-emerald-50 border-emerald-200 text-emerald-900",
  medium: "bg-amber-50 border-amber-200 text-amber-900",
  low: "bg-slate-50 border-slate-200 text-slate-700",
};
const CONFIDENCE_LABEL: Record<string, string> = { high: "높음", medium: "중간", low: "낮음" };

const FLAG_STYLE: Record<string, string> = {
  strength: "bg-emerald-50 border-emerald-200 text-emerald-800",
  concern: "bg-amber-50 border-amber-200 text-amber-800",
  milestone: "bg-sky-50 border-sky-200 text-sky-800",
};
const FLAG_ICON: Record<string, string> = { strength: "⭐", concern: "⚡", milestone: "🏆" };
const FLAG_LABEL: Record<string, string> = { strength: "강점", concern: "주목", milestone: "이정표" };

const AREA_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"];

export default function ChildDevelopmentDashboard({
  current, ageGroup, history = [], onExportPDF, onSave, isSaving, saveSuccess,
}: Props) {
  const areaData = Object.entries(current.area_engagement).map(([key, val], i) => ({
    area: AREA_LABELS[key] ?? key,
    score: val.score,
    fill: AREA_COLORS[i],
  }));

  const radarData = Object.entries(current.developmental_scales).map(([key, val]) => ({
    subject: SCALE_LABELS[key] ?? key,
    value: val as number,
    fullMark: 5,
  }));

  const avgAreaScore = (areaData.reduce((s, d) => s + d.score, 0) / areaData.length).toFixed(1);
  const avgScaleScore = (radarData.reduce((s, d) => s + d.value, 0) / radarData.length).toFixed(1);

  const trendData = history.map((h) => {
    const p = h.structured_payload;
    return {
      date: new Date(h.observed_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      실용생활: p.area_engagement.practical_life.score,
      감각: p.area_engagement.sensorial.score,
      언어: p.area_engagement.language.score,
      수학: p.area_engagement.mathematics.score,
      문화: p.area_engagement.cultural.score,
    };
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">발달 분석 결과</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {ageGroup}세 그룹 ·{" "}
            {new Date(current.observed_at_iso).toLocaleDateString("ko-KR", {
              year: "numeric", month: "long", day: "numeric",
            })}
            {current.session_duration_minutes != null && ` · ${current.session_duration_minutes}분`}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving || saveSuccess}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
                saveSuccess
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white"
              }`}
            >
              {saveSuccess ? "✓ 저장됨" : isSaving ? "저장 중..." : "관찰 저장"}
            </button>
          )}
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition"
            >
              PDF 내보내기
            </button>
          )}
        </div>
      </div>

      {/* 요약 지표 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="영역 평균 점수" value={`${avgAreaScore} / 5`} color="emerald" />
        <SummaryCard label="발달 척도 평균" value={`${avgScaleScore} / 5`} color="sky" />
        <SummaryCard
          label="민감기 신호"
          value={`${current.sensitive_period_signals.length}개`}
          color="amber"
        />
        <SummaryCard
          label="추천 교구"
          value={`${current.recommended_materials.length}개`}
          color="purple"
        />
      </div>

      {/* 주목 플래그 */}
      {current.attention_flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {current.attention_flags.map((flag, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 border rounded-xl px-3 py-2 text-sm ${FLAG_STYLE[flag.flag_type]}`}
            >
              <span>{FLAG_ICON[flag.flag_type]}</span>
              <div>
                <span className="text-xs font-semibold">[{FLAG_LABEL[flag.flag_type]}]</span>
                <span className="ml-1">{flag.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 차트 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="발달 5대 척도">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748b" }} />
              <Radar
                dataKey="value"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.25}
                dot={{ r: 3, fill: "#10b981" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="영역별 참여도 (1–5)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={areaData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} tickCount={6} />
              <YAxis type="category" dataKey="area" tick={{ fontSize: 11, fill: "#64748b" }} width={64} />
              <Tooltip
                formatter={(v: number) => [`${v} / 5`, "점수"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 11, fill: "#64748b" }}>
                {areaData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 영역별 세부 행동 */}
      <ChartCard title="영역별 관찰 세부 내용">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
          {Object.entries(current.area_engagement).map(([key, val], i) => (
            <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{AREA_LABELS[key]}</span>
                <ScoreBadge score={val.score} color={AREA_COLORS[i]} />
              </div>
              {val.materials_used.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {val.materials_used.map((m, j) => (
                    <span key={j} className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600">
                      {m}
                    </span>
                  ))}
                </div>
              )}
              {val.observed_behaviors.slice(0, 2).map((b, j) => (
                <p key={j} className="text-xs text-slate-600 leading-relaxed">• {b}</p>
              ))}
              {val.notes && <p className="text-xs text-slate-500 italic border-t border-slate-200 pt-2">{val.notes}</p>}
            </div>
          ))}
        </div>
      </ChartCard>

      {/* 종단 추세 */}
      {trendData.length > 1 && (
        <ChartCard title={`영역별 발달 추세 (${trendData.length}회 관찰)`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ right: 16, top: 8 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {["실용생활", "감각", "언어", "수학", "문화"].map((label, i) => (
                <Line key={label} type="monotone" dataKey={label} stroke={AREA_COLORS[i]}
                  strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 민감기 신호 */}
      {current.sensitive_period_signals.length > 0 && (
        <ChartCard title="민감기 신호 분석">
          <div className="space-y-3 pt-2">
            {current.sensitive_period_signals.map((s, i) => (
              <div key={i} className={`border rounded-xl p-4 space-y-2 ${CONFIDENCE_STYLE[s.confidence]}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{s.period_name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 border border-current/20">
                    신뢰도: {CONFIDENCE_LABEL[s.confidence]}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {s.behavioral_evidence.map((e, j) => (
                    <li key={j} className="text-xs">• {e}</li>
                  ))}
                </ul>
                <p className="text-xs opacity-70 italic border-t pt-2">{s.recommended_response}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* 추천 교구 + 후속 행동 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="다음 단계 추천 교구">
          <div className="space-y-3 pt-2">
            {current.recommended_materials.map((m, i) => (
              <div key={i} className="flex gap-3 items-start border border-slate-100 rounded-xl p-3 bg-slate-50">
                <span className="text-xl">📦</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{m.material_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-medium">{m.area}</span> · {m.rationale}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="교사 후속 관찰 포인트">
          <ul className="space-y-2.5 pt-2">
            {current.follow_up_actions.map((a, i) => (
              <li key={i} className="flex gap-3 items-start text-sm text-slate-700">
                <span className="w-6 h-6 flex-shrink-0 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{a}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      {/* 전체 요약 */}
      <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5 space-y-2">
        <h3 className="text-sm font-semibold text-emerald-800">교사 관찰 요약</h3>
        <p className="text-sm text-emerald-900 leading-relaxed">{current.observer_summary}</p>
        {current.setting_notes && (
          <p className="text-xs text-emerald-700 italic border-t border-emerald-200 pt-2">{current.setting_notes}</p>
        )}
      </div>
    </div>
  );
}

// ── 내부 서브 컴포넌트 ──────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const bg = { emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    sky: "bg-sky-50 border-sky-200 text-sky-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900" }[color];
  return (
    <div className={`border rounded-2xl p-4 text-center ${bg}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-1">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
      {children}
    </div>
  );
}

function ScoreBadge({ score, color }: { score: number; color: string }) {
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
      style={{ backgroundColor: color }}
    >
      {score}/5
    </span>
  );
}
