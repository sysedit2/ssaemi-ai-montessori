/**
 * Gemma 4 API 커넥터
 * Ollama native API (/api/chat) 우선 호출 — 실제 Gemma 4 모델 사용
 * 연결 불가 시 → 키워드 기반 로컬 분석(시뮬레이션) 폴백
 */
import type { GemmaRawLog } from "./loms-schema";

const OLLAMA_BASE  = process.env.GEMMA_OLLAMA_ENDPOINT ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.GEMMA_MODEL_NAME      ?? "gemma4:latest";

// ── Ollama native API 호출 (thinking 모드 지원) ────────────────
async function callViaOllama(systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const fullPrompt = `[시스템 지시]\n${systemPrompt}\n\n[관찰 데이터]\n${userPrompt}`;
    const isComplex  = fullPrompt.length > 300;

    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        think: isComplex,           // Gemma 4 thinking mode
        messages: [
          { role: "user", content: fullPrompt },
        ],
        options: {
          temperature:    0.1,
          num_predict:    isComplex ? 3500 : 1200, // thinking 토큰 여유 포함
          num_ctx:        8192,
          num_gpu:        99,
          num_thread:     12,
          repeat_penalty: 1.1,
        },
      }),
      signal: AbortSignal.timeout(
        process.env.GEMMA_TIMEOUT_MS ? parseInt(process.env.GEMMA_TIMEOUT_MS) : 120_000
      ), // 로컬: 2분, Vercel: GEMMA_TIMEOUT_MS=3000 으로 빠른 폴백
    });

    if (!res.ok) {
      console.warn("[Gemma] Ollama 응답 오류:", res.status, res.statusText);
      return null;
    }

    const data = await res.json() as {
      message?: { content?: string; thinking?: string };
      done?: boolean;
    };

    const content = data.message?.content?.trim() ?? "";
    if (content) return content;

    // thinking 필드 fallback (content가 비어 있을 때)
    return data.message?.thinking?.trim() ?? null;
  } catch (e) {
    console.warn("[Gemma] Ollama 연결 실패 → 시뮬레이션 폴백:", (e as Error).message);
    return null;
  }
}

// ── Ollama 응답에서 JSON 추출 ──────────────────────────────────
function extractJson(raw: string): unknown | null {
  // 코드 블록 제거
  const stripped = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // 첫 번째 완전한 JSON 객체 추출
  const start = stripped.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === "{") depth++;
    else if (stripped[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(stripped.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// ── 로컬 분석 엔진 (시뮬레이션 모드) ────────────────────────
function localAnalysis(journal: string, ageGroup: string): GemmaRawLog {
  void ageGroup;
  const t0   = Date.now();
  const text = journal.toLowerCase();

  const retryKws   = ["다시", "반복", "또", "재시도", "한 번 더", "회"];
  const errorKws   = ["무너", "틀렸", "실패", "오류", "잘못", "떨어"];
  const focusKws   = ["집중", "몰입", "완성", "끝까지", "계속", "지속"];
  const autoKws    = ["스스로", "혼자", "직접", "자기", "자발"];
  const hintKws    = ["물었", "도움", "선생님", "힌트", "질문"];

  const count = (kws: string[]) => kws.reduce((n, k) => n + (text.split(k).length - 1), 0);

  const retryCount  = Math.max(1, count(retryKws));
  const errorCount  = count(errorKws);
  const selfCount   = count(autoKws);
  const hintCount   = count(hintKws);
  const totalEvents = retryCount + errorCount + selfCount + hintCount + count(focusKws) + 12;

  const timeMatches = [...journal.matchAll(/(\d{1,2})[시:]\s*(\d{0,2})/g)];
  const times       = timeMatches.map(m => `${m[1].padStart(2,"0")}:${(m[2]||"00").padStart(2,"0")}`);
  const peakStart   = times[0] ?? "10:00";
  const peakEnd     = times[1] ?? "11:15";
  const minMatch    = journal.match(/(\d+)\s*분/);
  const focusMin    = minMatch ? parseInt(minMatch[1]) : 25 + Math.floor(Math.random() * 20);

  const hasArea  = (kws: string[]) => kws.some(k => text.includes(k));
  const areaScore = (present: boolean, base: number) =>
    present ? base + Math.floor(Math.random() * 15) : 10 + Math.floor(Math.random() * 20);

  const mathKws = ["수", "숫자", "구슬", "비드", "수학", "계산", "십진", "스탬프", "백"];
  const sensKws = ["타워", "감각", "색", "크기", "모양", "무게", "촉각", "시각"];
  const langKws = ["읽기", "쓰기", "말", "언어", "글자", "단어", "이야기"];
  const pracKws = ["정리", "청소", "씻기", "따르기", "실용", "생활", "정돈"];
  const cultKws = ["지구", "과학", "문화", "역사", "음악", "예술", "자연"];

  const sensitivePeriods = [];
  if (hasArea(mathKws)) sensitivePeriods.push({ period: "수(Number)에 대한 민감기", trigger_keywords: mathKws.filter(k => text.includes(k)), frequency: count(mathKws) });
  if (hasArea(sensKws)) sensitivePeriods.push({ period: "감각 정제 민감기",           trigger_keywords: sensKws.filter(k => text.includes(k)), frequency: count(sensKws) });
  if (selfCount > 1)    sensitivePeriods.push({ period: "질서 및 자율성 민감기",       trigger_keywords: autoKws.filter(k => text.includes(k)), frequency: selfCount });

  const selfCorrectionRate = selfCount > 0 ? Math.min(95, 60 + selfCount * 8 - hintCount * 5) : 45;
  const changeFromLast     = 10 + Math.floor(Math.random() * 25);

  return {
    engine: "gemma-4-local",
    mode:   "simulation",
    total_events: totalEvents,
    pii_protected: true,
    persistence: {
      raw_observation: `오류 ${errorCount}회 발생 후 ${focusMin}분 이상 지속, 재시도 ${retryCount}회`,
      error_count: errorCount,
      sustained_minutes: focusMin,
      retry_count: retryCount,
    },
    flow: {
      raw_observation: `평균 집중 ${focusMin}분, 전월 대비 +${changeFromLast}%, 피크 ${peakStart}~${peakEnd}`,
      avg_focus_minutes: focusMin,
      peak_window_start: peakStart,
      peak_window_end:   peakEnd,
      change_from_last_pct: changeFromLast,
    },
    autonomy: {
      raw_observation: `자기수정 ${selfCorrectionRate}%, 교사 힌트 요청 ${hintCount}회`,
      self_correction_rate: selfCorrectionRate,
      teacher_hint_requests: hintCount,
    },
    area_raw_scores: {
      practical_life: areaScore(hasArea(pracKws), 55),
      sensorial:      areaScore(hasArea(sensKws), 65),
      language:       areaScore(hasArea(langKws), 50),
      mathematics:    areaScore(hasArea(mathKws), 70),
      cultural:       areaScore(hasArea(cultKws), 40),
    },
    sensitive_period_raw: sensitivePeriods,
    critical_moment_early: `[CHILD]이 ${sensitivePeriods[0]?.period ?? "감각 작업"} 중 ${retryCount}회 반복, 오류 후 재시도 ${errorCount}회 포착`,
    processing_ms: Date.now() - t0,
  };
}

// ── 메인 진입점 ──────────────────────────────────────────────
export async function analyzeWithGemma(
  systemPrompt: string,
  userPrompt: string,
  journal: string,
  ageGroup: string
): Promise<GemmaRawLog> {
  const t0 = Date.now();

  // 1차: Ollama native API (실제 Gemma 4)
  const ollamaRaw = await callViaOllama(systemPrompt, userPrompt);

  if (ollamaRaw) {
    const parsed = extractJson(ollamaRaw);
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      return {
        ...obj,
        engine:        "gemma-4-ollama",
        mode:          "live",
        pii_protected: true,
        processing_ms: Date.now() - t0,
      } as GemmaRawLog;
    }
    console.warn("[Gemma] JSON 추출 실패 → 시뮬레이션 폴백\n원문:", ollamaRaw.slice(0, 300));
  }

  // 2차: 로컬 시뮬레이션
  return localAnalysis(journal, ageGroup);
}
