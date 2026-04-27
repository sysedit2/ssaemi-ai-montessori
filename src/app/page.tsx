"use client";

import { useState, useCallback } from "react";
import ObservationWorkspace from "@/components/ObservationWorkspace";
import ChildDevelopmentDashboard from "@/components/ChildDevelopmentDashboard";
import ParentReport from "@/components/ParentReport";
import ChildSelector from "@/components/ChildSelector";
import ObservationHistory from "@/components/ObservationHistory";
import HolisticReport from "@/components/HolisticReport";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardSkeleton, AnalyzingOverlay } from "@/components/LoadingSkeleton";
import { exportDashboardToPDF } from "@/lib/pdf-export";
import { saveObservation, type Child, type ObservationEntry, type AgeGroup } from "@/lib/local-store";
import type { ObservationResult } from "@/lib/observation-schema";
import type { HolisticReport as HolisticReportType } from "@/lib/loms-schema";

type Tab = "input" | "dashboard" | "report" | "holistic";

export default function HomePage() {
  const [result, setResult]               = useState<ObservationResult | null>(null);
  const [ageGroup, setAgeGroup]           = useState<AgeGroup>("3-6");
  const [activeTab, setActiveTab]         = useState<Tab>("input");
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [isLomsAnalyzing, setIsLomsAnalyzing] = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [holisticReport, setHolisticReport] = useState<HolisticReportType | null>(null);
  const [lomsError, setLomsError]         = useState<string | null>(null);
  const [journalSnapshot, setJournalSnapshot] = useState("");

  const handleAnalysisStart = useCallback(() => {
    setIsAnalyzing(true);
    setSaveSuccess(false);
  }, []);

  const handleAnalysisComplete = useCallback((res: ObservationResult, group: AgeGroup, journal?: string) => {
    setResult(res);
    setAgeGroup(group);
    setActiveTab("dashboard");
    setIsAnalyzing(false);
    setSaveSuccess(false);
    if (journal) setJournalSnapshot(journal);
  }, []);

  const handleAnalysisError = useCallback(() => setIsAnalyzing(false), []);

  function handleSave() {
    if (!result || !selectedChild) return;
    setIsSaving(true);
    try {
      saveObservation(selectedChild.id, ageGroup, result, journalSnapshot);
      setSaveSuccess(true);
      setRefreshHistory(n => n + 1);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLomsAnalyze() {
    if (!journalSnapshot) { setLomsError("먼저 관찰 입력 탭에서 분석을 실행해주세요."); return; }
    setIsLomsAnalyzing(true);
    setLomsError(null);
    try {
      const now = new Date();
      const from = new Date(now); from.setDate(1);
      const res = await fetch("/api/dual-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journalText: journalSnapshot,
          ageGroup,
          childNickname: selectedChild?.nickname ?? "아동",
          childAge: ageGroup === "3-6" ? 5 : ageGroup === "6-9" ? 7 : 10,
          institution: "Ssaemi-ai Center",
          period: {
            from: from.toISOString().slice(0, 10),
            to:   now.toISOString().slice(0, 10),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "LOMS 분석 실패");
      setHolisticReport(data as HolisticReportType);
    } catch (e) {
      setLomsError((e as Error).message);
    } finally {
      setIsLomsAnalyzing(false);
    }
  }

  function handleHistorySelect(entry: ObservationEntry) {
    setResult(entry.structured_payload);
    setAgeGroup(entry.age_group as AgeGroup);
    if (entry.journal_text) setJournalSnapshot(entry.journal_text);
    setActiveTab("dashboard");
    setSaveSuccess(true);
  }

  async function handleExportPDF() {
    await exportDashboardToPDF(
      "dashboard-content",
      `발달분석_${selectedChild?.nickname ?? "아동"}_${new Date().toLocaleDateString("ko-KR")}.pdf`
    );
  }

  const tabs: { id: Tab; label: string; badge?: string; disabled?: boolean }[] = [
    { id: "input",    label: "관찰 입력" },
    { id: "dashboard", label: "발달 대시보드", disabled: !result },
    { id: "report",   label: "학부모 리포트",  disabled: !result },
    { id: "holistic", label: "LOMS 통합 리포트", badge: "NEW", disabled: !result },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {isAnalyzing && <AnalyzingOverlay />}

      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">S</div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">SSAEMI AI</h1>
              <p className="text-xs text-slate-400">몬테소리 관찰 발달 분석 플랫폼</p>
            </div>
          </div>

          <nav className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : tab.disabled
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white align-middle">
                    {tab.badge}
                  </span>
                )}
                {tab.id === "dashboard" && result && (
                  <span className="ml-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block align-middle" />
                )}
              </button>
            ))}
          </nav>

          {selectedChild && (
            <div className="hidden sm:flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex-shrink-0">
              <span>👦</span>
              <span className="font-medium text-emerald-800">{selectedChild.nickname}</span>
              <span className="text-xs text-slate-400">{selectedChild.age_group}세</span>
            </div>
          )}
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ── 관찰 입력 탭 ── */}
        {activeTab === "input" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-5">
              <ErrorBoundary>
                <ChildSelector selectedId={selectedChild?.id ?? null} onSelect={setSelectedChild} />
              </ErrorBoundary>
              <ErrorBoundary>
                <ObservationHistory
                  key={refreshHistory}
                  childId={selectedChild?.id ?? null}
                  onSelect={handleHistorySelect}
                />
              </ErrorBoundary>
            </div>
            <div className="lg:col-span-2">
              <ErrorBoundary>
                <ObservationWorkspace
                  onAnalysisStart={handleAnalysisStart}
                  onAnalysisComplete={handleAnalysisComplete}
                  onAnalysisError={handleAnalysisError}
                  defaultAgeGroup={selectedChild?.age_group}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* ── 발달 대시보드 탭 ── */}
        {activeTab === "dashboard" && (
          isAnalyzing ? <DashboardSkeleton /> : result ? (
            <div id="dashboard-content">
              <ErrorBoundary>
                <ChildDevelopmentDashboard
                  current={result}
                  ageGroup={ageGroup}
                  onSave={selectedChild ? handleSave : undefined}
                  isSaving={isSaving}
                  saveSuccess={saveSuccess}
                  onExportPDF={handleExportPDF}
                />
              </ErrorBoundary>
            </div>
          ) : null
        )}

        {/* ── 학부모 리포트 탭 ── */}
        {activeTab === "report" && result && (
          <div className="max-w-2xl mx-auto">
            <ErrorBoundary>
              <ParentReport
                analysisResult={result}
                observationDate={result.observed_at_iso}
                defaultNickname={selectedChild?.nickname}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* ── LOMS 통합 리포트 탭 ── */}
        {activeTab === "holistic" && result && (
          <div className="space-y-6">
            {/* LOMS 실행 컨트롤 */}
            {!holisticReport && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-slate-800">LOMS 통합 발달 리포트</h2>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">2026</span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Gemma 4 로컬 엔진과 OpenAI Evals를 병렬 실행하여 듀얼 검증된 심층 리포트를 생성합니다.
                    </p>
                  </div>

                  {/* 듀얼 엔진 설명 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-4 space-y-1" style={{ background: "#EBF4FF", border: "1px solid #BFDBFE" }}>
                      <p className="text-xs font-bold text-blue-700">Gemma 4 · 좌측</p>
                      <p className="text-xs text-blue-600">로컬 행동 로그 분석<br />PII 100% 비식별화<br />실시간 이벤트 카운팅</p>
                    </div>
                    <div className="rounded-xl p-4 space-y-1" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                      <p className="text-xs font-bold text-amber-700">OpenAI Evals · 우측</p>
                      <p className="text-xs text-amber-600">교육적 정합성 검증<br />5차원 루브릭 채점<br />전문가 인사이트 생성</p>
                    </div>
                  </div>

                  {lomsError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      {lomsError}
                    </div>
                  )}

                  <button
                    onClick={handleLomsAnalyze}
                    disabled={isLomsAnalyzing}
                    className="w-full py-3.5 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50"
                    style={{ background: isLomsAnalyzing ? "#94A3B8" : "#4A5568" }}
                  >
                    {isLomsAnalyzing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Gemma 4 + GPT-4o 병렬 분석 중...
                      </span>
                    ) : "LOMS 통합 리포트 생성"}
                  </button>
                  <p className="text-xs text-slate-400 text-center">약 15-25초 소요 · 두 엔진이 동시에 실행됩니다</p>
                </div>
              </div>
            )}

            {/* LOMS 리포트 결과 */}
            {holisticReport && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setHolisticReport(null); }}
                      className="px-4 py-2 text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition"
                    >
                      다시 생성
                    </button>
                    <button
                      onClick={() => exportDashboardToPDF("holistic-report-content",
                        `LOMS리포트_${selectedChild?.nickname ?? "아동"}_${new Date().toLocaleDateString("ko-KR")}.pdf`)}
                      className="px-4 py-2 text-sm font-medium text-white rounded-xl transition"
                      style={{ background: "#4A5568" }}
                    >
                      PDF 내보내기
                    </button>
                  </div>
                </div>
                <div id="holistic-report-content" className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
                  <ErrorBoundary>
                    <HolisticReport report={holisticReport} />
                  </ErrorBoundary>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
