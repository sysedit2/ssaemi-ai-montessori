"use client";

import type { HolisticReport } from "@/lib/loms-schema";

interface Props { report: HolisticReport; }

// ── 색상 상수 ─────────────────────────────────────────────────
const BEIGE  = "#FDFBF7";
const SLATE  = "#4A5568";
const BLUE_L = "#EBF4FF";  // Gemma 4 영역
const BLUE_B = "#3B82F6";
const GOLD_L = "#FFFBEB";  // OpenAI 영역
const GOLD_B = "#D97706";

export default function HolisticReport({ report }: Props) {
  const { gemma, evals } = report;
  const overallRubric = Object.values(evals.rubric_scores).reduce((a,b) => a+b, 0) / 5;

  return (
    <div style={{ background: BEIGE, color: SLATE }} className="min-h-screen font-sans">

      {/* ── 리포트 헤더 ──────────────────────────────────────── */}
      <div className="border-b border-stone-200 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs tracking-widest text-stone-400 uppercase mb-1">
                Montessori-AI · LOMS Report 2026
              </p>
              <h1 className="text-2xl font-light tracking-tight" style={{ color: SLATE }}>
                {report.child_nickname}의 전인 성장 리포트
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                {report.child_age}세 · {report.institution} ·{" "}
                {report.period.from} – {report.period.to}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 text-xs text-stone-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                듀얼 엔진 검증 완료
              </div>
              <p className="text-xs text-stone-400 mt-1">
                총 처리 {(report.total_pipeline_ms / 1000).toFixed(1)}초
              </p>
            </div>
          </div>

          {/* 전략적 메시지 */}
          <blockquote className="mt-5 border-l-2 border-stone-300 pl-4 text-sm italic text-stone-500 leading-relaxed">
            "우리는 AI를 통해 교사의 업무를 줄인 것이 아니라, 교사가 아이의 영혼을 관찰할 수 있는 시간을 벌어주었습니다.
            이 리포트는 그 관찰의 기록입니다."
          </blockquote>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-10">

        {/* ── 1. 시스템 신뢰도 ────────────────────────────────── */}
        <Section title="01  시스템 신뢰도" subtitle="데이터 생성 방식의 투명한 공개">
          <DualCard
            left={
              <div className="space-y-3">
                <EngineTag type="gemma" />
                <MetaRow label="역할" value="실시간 행동 로그 분석 및 비식별화" />
                <MetaRow label="분석 이벤트" value={`총 ${gemma.total_events.toLocaleString()}개`} highlight />
                <MetaRow label="개인정보 보호" value="원내 처리 · PII 100% 비식별화" />
                <MetaRow label="작동 모드" value={
                  gemma.mode === "live"
                    ? (gemma.engine === "gemma-4-ollama" ? "Ollama 라이브 ✅" : "vLLM 라이브 ✅")
                    : "로컬 분석 (시뮬레이션)"
                } highlight={gemma.mode === "live"} />
                <MetaRow label="처리 시간" value={`${gemma.processing_ms}ms`} />
              </div>
            }
            right={
              <div className="space-y-3">
                <EngineTag type="openai" />
                <MetaRow label="역할" value="교육적 정합성 및 논리 교정" />
                <MetaRow label="모델 추론 정확도" value={`${evals.inference_accuracy}%`} highlight />
                <MetaRow label="전문가 루브릭 일치도" value={`${evals.montessori_alignment}%`} highlight />
                <MetaRow label="관찰자 어조 점수" value={`${evals.observer_tone_score}점`} />
                <MetaRow label="평가 모델" value={evals.model_version} />
              </div>
            }
          />
        </Section>

        {/* ── 2. LOMS 핵심 지표 ───────────────────────────────── */}
        <Section title="02  LOMS 핵심 발달 지표" subtitle="아이의 내면적 성장을 수치화한 데이터">
          <div className="space-y-4">
            <LomsRow
              metric="끈기 (Persistence)"
              left={gemma.persistence.raw_observation}
              leftMeta={`오류 ${gemma.persistence.error_count}회 · 재시도 ${gemma.persistence.retry_count}회 · ${gemma.persistence.sustained_minutes}분 지속`}
              right={evals.persistence_insight}
              score={Math.round(gemma.persistence.sustained_minutes * 2)}
            />
            <LomsRow
              metric="몰입 (Flow)"
              left={gemma.flow.raw_observation}
              leftMeta={`피크 ${gemma.flow.peak_window_start}~${gemma.flow.peak_window_end} · 전월 대비 +${gemma.flow.change_from_last_pct}%`}
              right={evals.flow_insight}
              score={Math.min(99, Math.round(gemma.flow.avg_focus_minutes * 2.2))}
            />
            <LomsRow
              metric="자율성 (Autonomy)"
              left={gemma.autonomy.raw_observation}
              leftMeta={`자기수정 ${gemma.autonomy.self_correction_rate}% · 힌트 요청 ${gemma.autonomy.teacher_hint_requests}회`}
              right={evals.autonomy_insight}
              score={gemma.autonomy.self_correction_rate}
            />
          </div>
        </Section>

        {/* ── 3. 5대 영역 대조 ─────────────────────────────────── */}
        <Section title="03  5대 영역 원시 점수" subtitle="Gemma 4 로컬 분석 기준 (0–100)">
          <div className="grid grid-cols-5 gap-3">
            {[
              ["실용 생활", gemma.area_raw_scores.practical_life],
              ["감각",      gemma.area_raw_scores.sensorial],
              ["언어",      gemma.area_raw_scores.language],
              ["수학",      gemma.area_raw_scores.mathematics],
              ["문화",      gemma.area_raw_scores.cultural],
            ].map(([label, score]) => (
              <AreaBar key={label as string} label={label as string} score={score as number} />
            ))}
          </div>
        </Section>

        {/* ── 4. 결정적 순간 ──────────────────────────────────── */}
        <Section title="04  결정적 순간 분석" subtitle="가장 높은 몰입을 보였던 순간의 딥러닝 해석">
          <DualCard
            left={
              <div className="space-y-3">
                <EngineTag type="gemma" />
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">초기 단계 (행동 포착)</p>
                <p className="text-sm text-slate-700 leading-relaxed bg-white rounded-xl p-4 border border-blue-100">
                  {gemma.critical_moment_early}
                </p>
                {gemma.sensitive_period_raw.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-stone-400">탐지된 민감기 신호</p>
                    {gemma.sensitive_period_raw.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: BLUE_L, color: BLUE_B }}>
                          {s.period}
                        </span>
                        <span className="text-xs text-stone-400">빈도 {s.frequency}회</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            }
            right={
              <div className="space-y-3">
                <EngineTag type="openai" />
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">후기 단계 (교육적 추론)</p>
                <p className="text-sm text-slate-700 leading-relaxed bg-white rounded-xl p-4 border border-amber-100">
                  {evals.critical_moment_late}
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">전략적 제안</p>
                  <p className="text-sm text-amber-900 leading-relaxed">{evals.strategic_recommendation}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ReadinessBar pct={evals.next_material_readiness_pct} />
                    <span className="text-xs text-amber-700 font-medium">
                      {evals.next_material_name} 준비도 {evals.next_material_readiness_pct}%
                    </span>
                  </div>
                </div>
              </div>
            }
          />
        </Section>

        {/* ── 5. OpenAI Evals 루브릭 점수 ─────────────────────── */}
        <Section title="05  Evals 루브릭 검증" subtitle="GPT-4o가 분석 품질을 5개 차원에서 채점한 결과">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              ["영역 분류",   evals.rubric_scores.area_classification],
              ["민감기 탐지", evals.rubric_scores.sensitive_period_detection],
              ["발달 추론",   evals.rubric_scores.developmental_inference],
              ["어조 적절성", evals.rubric_scores.language_appropriateness],
              ["실행 가능성", evals.rubric_scores.actionability],
            ].map(([label, score]) => (
              <RubricCard key={label as string} label={label as string} score={score as number} />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-100 rounded-xl">
            <span className="text-2xl font-bold text-amber-700">{overallRubric.toFixed(1)}</span>
            <div>
              <p className="text-xs font-semibold text-amber-800">종합 루브릭 점수 (5점 만점)</p>
              <p className="text-xs text-amber-600">몬테소리 전문가 기준 교육적 정렬도</p>
            </div>
          </div>
        </Section>

        {/* ── 6. 가정 연계 가이드 ─────────────────────────────── */}
        <Section title="06  가정 연계 가이드" subtitle="몰입 히트맵 분석 기반 최적 시간대 추천">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="text-center px-5 py-3 rounded-xl" style={{ background: GOLD_L, border: `1px solid #FDE68A` }}>
                <p className="text-lg font-bold" style={{ color: GOLD_B }}>
                  {gemma.flow.peak_window_start}
                </p>
                <p className="text-xs text-amber-600">피크 시작</p>
              </div>
              <div className="flex-1 h-2 rounded-full bg-amber-100 relative">
                <div className="absolute inset-y-0 left-0 w-2/3 bg-amber-400 rounded-full" />
              </div>
              <div className="text-center px-5 py-3 rounded-xl" style={{ background: GOLD_L, border: `1px solid #FDE68A` }}>
                <p className="text-lg font-bold" style={{ color: GOLD_B }}>
                  {gemma.flow.peak_window_end}
                </p>
                <p className="text-xs text-amber-600">피크 종료</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed border-t border-stone-100 pt-4">
              {evals.home_guide_message}
            </p>
          </div>
        </Section>

        {/* 리포트 푸터 */}
        <footer className="border-t border-stone-200 pt-6 text-center space-y-1">
          <p className="text-xs text-stone-400">
            본 리포트는 SSAEMI AI · LOMS v1.0으로 생성되었습니다.
          </p>
          <p className="text-xs text-stone-400">
            생성 시각: {new Date(report.generated_at).toLocaleString("ko-KR")} ·
            리포트 ID: <code className="font-mono">{report.report_id.slice(0, 8)}</code>
          </p>
          <p className="text-xs text-stone-400 mt-2">
            Gemma 4 처리 {gemma.processing_ms}ms · Evals 처리 {evals.eval_ms}ms · 전체 {report.total_pipeline_ms}ms
          </p>
        </footer>
      </div>
    </div>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight" style={{ color: SLATE }}>{title}</h2>
        <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function DualCard({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl border p-5 space-y-3" style={{ background: BLUE_L, borderColor: "#BFDBFE" }}>
        {left}
      </div>
      <div className="rounded-2xl border p-5 space-y-3" style={{ background: GOLD_L, borderColor: "#FDE68A" }}>
        {right}
      </div>
    </div>
  );
}

function EngineTag({ type }: { type: "gemma" | "openai" }) {
  return type === "gemma" ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: "#DBEAFE", color: BLUE_B }}>
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      Gemma 4 · 로컬 분석 엔진
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: "#FEF3C7", color: GOLD_B }}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      OpenAI Evals · GPT-4o 검증
    </span>
  );
}

function MetaRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-stone-500 text-xs">{label}</span>
      <span className={`font-medium text-xs ${highlight ? "text-slate-800" : "text-slate-600"}`}>
        {value}
      </span>
    </div>
  );
}

function LomsRow({ metric, left, leftMeta, right, score }: {
  metric: string; left: string; leftMeta: string; right: string; score: number;
}) {
  const pct = Math.min(100, score);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
        <span className="text-sm font-semibold" style={{ color: SLATE }}>{metric}</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold text-emerald-600">{pct}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-stone-100">
        <div className="px-5 py-4 space-y-1" style={{ background: BLUE_L }}>
          <p className="text-xs text-blue-400 font-semibold">Gemma 4 원시 로그</p>
          <p className="text-sm text-slate-700 leading-relaxed">{left}</p>
          <p className="text-xs text-stone-400 mt-1">{leftMeta}</p>
        </div>
        <div className="px-5 py-4 space-y-1" style={{ background: GOLD_L }}>
          <p className="text-xs font-semibold" style={{ color: GOLD_B }}>OpenAI 정제 인사이트</p>
          <p className="text-sm text-slate-700 leading-relaxed">{right}</p>
        </div>
      </div>
    </div>
  );
}

function AreaBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : "#94A3B8";
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 text-center space-y-2">
      <p className="text-xs text-stone-500">{label}</p>
      <div className="w-full h-20 flex items-end justify-center">
        <div className="w-8 rounded-t-lg transition-all" style={{ height: `${score}%`, background: color, minHeight: 4 }} />
      </div>
      <p className="text-sm font-bold" style={{ color: SLATE }}>{score}</p>
    </div>
  );
}

function RubricCard({ label, score }: { label: string; score: number }) {
  const filled = Math.round(score);
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 text-center space-y-2">
      <p className="text-xs text-stone-500">{label}</p>
      <div className="flex justify-center gap-0.5">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="w-4 h-4 rounded-sm"
            style={{ background: i <= filled ? GOLD_B : "#E5E7EB" }} />
        ))}
      </div>
      <p className="text-sm font-bold" style={{ color: SLATE }}>{score} / 5</p>
    </div>
  );
}

function ReadinessBar({ pct }: { pct: number }) {
  return (
    <div className="flex-1 h-2 rounded-full bg-amber-100">
      <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
