"use client";

import { useState } from "react";
import type { ObservationResult } from "@/lib/observation-schema";

interface Report {
  greeting_paragraph: string;
  strengths: string[];
  growth_areas: string[];
  home_support_tips: string[];
  closing_paragraph: string;
  next_observation_focus: string;
}

interface Props {
  analysisResult: ObservationResult;
  observationDate?: string;
  defaultNickname?: string;
}

export default function ParentReport({ analysisResult, observationDate, defaultNickname }: Props) {
  const [nickname, setNickname] = useState(defaultNickname ?? "");
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generateReport() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parent-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisResult,
          childNickname: nickname.trim() || "우리 아이",
          observationDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data.report);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard() {
    if (!report) return;
    const text = [
      report.greeting_paragraph, "",
      "📌 이번 관찰에서 빛난 점",
      ...report.strengths.map((s) => `• ${s}`), "",
      "🌱 함께 성장할 영역",
      ...report.growth_areas.map((g) => `• ${g}`), "",
      "🏠 가정에서 지원하실 수 있는 방법",
      ...report.home_support_tips.map((t) => `• ${t}`), "",
      report.closing_paragraph, "",
      `다음 관찰 포인트: ${report.next_observation_focus}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-800">학부모 리포트 생성</h3>
        <p className="text-xs text-slate-500 mt-1">
          발달 분석 결과를 학부모가 이해하기 쉬운 언어로 자동 변환합니다.
        </p>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="아동 호칭 (예: 민준이)"
          maxLength={20}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <button
          onClick={generateReport}
          disabled={isLoading}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              생성 중
            </span>
          ) : "리포트 생성"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-4 border border-slate-200 rounded-xl p-5 text-sm text-slate-700 leading-relaxed">
          <p className="text-slate-800">{report.greeting_paragraph}</p>

          <ReportSection
            title="📌 이번 관찰에서 빛난 점"
            items={report.strengths}
            color="emerald"
          />
          <ReportSection
            title="🌱 함께 성장할 영역"
            items={report.growth_areas}
            color="amber"
          />
          <ReportSection
            title="🏠 가정에서 지원하실 수 있는 방법"
            items={report.home_support_tips}
            color="sky"
          />

          <p className="text-slate-800">{report.closing_paragraph}</p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs">
              <span className="font-semibold text-slate-700">다음 관찰 포인트:</span>{" "}
              <span className="text-slate-600">{report.next_observation_focus}</span>
            </p>
          </div>

          <button
            onClick={copyToClipboard}
            className={`flex items-center gap-2 text-xs font-medium transition px-3 py-2 rounded-lg ${
              copied
                ? "bg-emerald-100 text-emerald-700"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            {copied ? "✓ 복사됨" : "📋 텍스트 복사"}
          </button>
        </div>
      )}
    </div>
  );
}

function ReportSection({
  title, items, color,
}: {
  title: string;
  items: string[];
  color: "emerald" | "amber" | "sky";
}) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
  };
  return (
    <div className={`border rounded-xl p-4 space-y-1.5 ${styles[color]}`}>
      <p className="font-semibold text-xs mb-2">{title}</p>
      {items.map((item, i) => (
        <p key={i} className="text-sm">• {item}</p>
      ))}
    </div>
  );
}
