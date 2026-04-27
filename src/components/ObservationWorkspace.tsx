"use client";

import { useState, useRef } from "react";
import type { ObservationResult } from "@/lib/observation-schema";

type AgeGroup = "3-6" | "6-9" | "9-12";

interface Props {
  onAnalysisStart?: () => void;
  onAnalysisComplete: (result: ObservationResult, ageGroup: AgeGroup, journal?: string) => void;
  onAnalysisError?: () => void;
  defaultAgeGroup?: AgeGroup;
}

export default function ObservationWorkspace({
  onAnalysisStart,
  onAnalysisComplete,
  onAnalysisError,
  defaultAgeGroup = "3-6",
}: Props) {
  const [journalText, setJournalText] = useState("");
  const [piiTokens, setPiiTokens] = useState("");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(defaultAgeGroup);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maskWarnings, setMaskWarnings] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => transcribeAudio(new Blob(chunksRef.current, { type: "audio/webm" }));
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setError("마이크 접근 권한이 필요합니다.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
  }

  async function transcribeAudio(blob: Blob) {
    setIsTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJournalText((prev) => (prev ? `${prev}\n\n${data.text}` : data.text));
    } catch (e) {
      setError((e as Error).message ?? "음성 전사 실패");
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleAnalyze() {
    if (!journalText.trim()) { setError("관찰일지 내용을 입력해주세요."); return; }
    setIsAnalyzing(true);
    setError(null);
    setMaskWarnings([]);
    onAnalysisStart?.();

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journalText,
          piiTokens: piiTokens.split(",").map((t) => t.trim()).filter(Boolean),
          ageGroup,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석 실패");
      if (data.maskWarnings?.length) setMaskWarnings(data.maskWarnings);
      onAnalysisComplete(data.result, ageGroup, journalText);
    } catch (e) {
      const msg = (e as Error).message ?? "알 수 없는 오류";
      setError(msg);
      onAnalysisError?.();
    } finally {
      setIsAnalyzing(false);
    }
  }

  const charCount = journalText.length;
  const charPct = Math.min((charCount / 8000) * 100, 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">관찰일지 입력</h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">연령 그룹</label>
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="3-6">3–6세 (Children's House)</option>
            <option value="6-9">6–9세 (Lower Elementary)</option>
            <option value="9-12">9–12세 (Upper Elementary)</option>
          </select>
        </div>
      </div>

      {/* 텍스트 입력 */}
      <div className="relative">
        <textarea
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
          placeholder={`관찰일지를 입력하거나 마이크로 녹음하세요.\n\n예: 오늘 오전 자유 작업 시간에 아동이 핑크 타워를 꺼내 바닥에 펼치고, 작은 것부터 순서대로 쌓기 시작했다. 3회 반복 후 골든 비드로 이동...`}
          rows={10}
          maxLength={8000}
          className="w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-700 placeholder-slate-400 resize-none focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
        />
        {/* 글자 수 진행바 */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${charPct > 90 ? "bg-red-400" : "bg-emerald-400"}`}
              style={{ width: `${charPct}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{charCount}/8000</span>
        </div>
      </div>

      {/* 음성 입력 */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isTranscribing || isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition disabled:opacity-50"
          >
            🎙️ {isTranscribing ? "전사 중..." : "음성 녹음"}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium transition"
          >
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            녹음 중지
          </button>
        )}
        {isTranscribing && (
          <span className="text-xs text-slate-500 animate-pulse">Whisper 전사 중...</span>
        )}
      </div>

      {/* PII 추가 토큰 */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          추가 실명 마스킹
          <span className="ml-1 font-normal text-slate-400">— 쉼표로 구분 (예: 김민준, 박서연)</span>
        </label>
        <input
          type="text"
          value={piiTokens}
          onChange={(e) => setPiiTokens(e.target.value)}
          placeholder="일지에 실명을 직접 입력한 경우 여기 기재하면 자동 마스킹됩니다"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>

      {/* PII 경고 */}
      {maskWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          <p className="text-xs font-medium text-amber-700">⚠ PII 마스킹 검토 필요</p>
          {maskWarnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600">{w}</p>
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* 분석 버튼 */}
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing || isTranscribing || !journalText.trim()}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition text-sm"
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            GPT-4o 분석 중...
          </span>
        ) : "발달 분석 시작"}
      </button>

      <p className="text-xs text-slate-400 text-center">
        분석 전 PII(이름, 연락처)는 자동 마스킹됩니다. 원문은 서버에 저장되지 않습니다.
      </p>
    </div>
  );
}
