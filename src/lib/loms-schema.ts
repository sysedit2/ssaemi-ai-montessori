/**
 * LOMS (Learning Observation Management System)
 * Gemma 4 (좌) ↔ OpenAI Evals (우) 듀얼 엔진 스키마
 */
import { z } from "zod";

// ── Gemma 4 원시 관찰 로그 (Left Side) ───────────────────────
export const GemmaRawLogSchema = z.object({
  engine: z.enum(["gemma-4-local", "gemma-4-ollama"]),
  mode: z.enum(["live", "simulation"]),          // Ollama 연결 여부
  total_events: z.number(),                       // 포착된 행동 이벤트 수
  pii_protected: z.boolean(),

  // LOMS 3대 핵심 지표 — 원시 로그
  persistence: z.object({
    raw_observation: z.string(),
    error_count: z.number(),
    sustained_minutes: z.number(),
    retry_count: z.number(),
  }),
  flow: z.object({
    raw_observation: z.string(),
    avg_focus_minutes: z.number(),
    peak_window_start: z.string(),               // "HH:MM"
    peak_window_end: z.string(),
    change_from_last_pct: z.number(),            // 전월 대비 %
  }),
  autonomy: z.object({
    raw_observation: z.string(),
    self_correction_rate: z.number(),            // 0-100
    teacher_hint_requests: z.number(),
  }),

  // 5대 영역 원시 점수
  area_raw_scores: z.object({
    practical_life: z.number().min(0).max(100),
    sensorial: z.number().min(0).max(100),
    language: z.number().min(0).max(100),
    mathematics: z.number().min(0).max(100),
    cultural: z.number().min(0).max(100),
  }),

  // 민감기 탐지 원시 신호
  sensitive_period_raw: z.array(z.object({
    period: z.string(),
    trigger_keywords: z.array(z.string()),
    frequency: z.number(),
  })),

  // 결정적 순간 (초기 단계)
  critical_moment_early: z.string(),
  processing_ms: z.number(),
});

// ── OpenAI Evals 검증 결과 (Right Side) ─────────────────────
export const EvalsResultSchema = z.object({
  engine: z.literal("openai-evals-gpt4o"),
  model_version: z.string(),

  // 정확도 지표
  inference_accuracy: z.number().min(0).max(100),     // 추론 정확도 %
  montessori_alignment: z.number().min(0).max(100),   // 전문가 루브릭 일치도 %
  observer_tone_score: z.number().min(0).max(100),    // 관찰자 어조 점수

  // LOMS 정제 인사이트
  persistence_insight: z.string(),
  flow_insight: z.string(),
  autonomy_insight: z.string(),

  // 결정적 순간 (후기 추론)
  critical_moment_late: z.string(),
  strategic_recommendation: z.string(),
  next_material_readiness_pct: z.number(),             // 다음 교구 준비도 %
  next_material_name: z.string(),

  // 가정 연계
  home_guide_message: z.string(),

  // 루브릭 세부 점수
  rubric_scores: z.object({
    area_classification: z.number().min(1).max(5),
    sensitive_period_detection: z.number().min(1).max(5),
    developmental_inference: z.number().min(1).max(5),
    language_appropriateness: z.number().min(1).max(5),
    actionability: z.number().min(1).max(5),
  }),

  eval_ms: z.number(),
});

// ── LOMS 통합 리포트 ────────────────────────────────────────
export const HolisticReportSchema = z.object({
  report_id: z.string(),
  generated_at: z.string(),
  period: z.object({ from: z.string(), to: z.string() }),
  child_nickname: z.string(),
  child_age: z.number(),
  institution: z.string(),
  gemma: GemmaRawLogSchema,
  evals: EvalsResultSchema,
  total_pipeline_ms: z.number(),
});

export type GemmaRawLog = z.infer<typeof GemmaRawLogSchema>;
export type EvalsResult = z.infer<typeof EvalsResultSchema>;
export type HolisticReport = z.infer<typeof HolisticReportSchema>;
