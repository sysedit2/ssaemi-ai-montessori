import { z } from "zod";

// ── Zod 스키마 (런타임 검증용) ────────────────────────────────────────────────

const Score = z.number().int().min(1).max(5);

const AreaEngagementSchema = z.object({
  score: Score,
  materials_used: z.array(z.string()),
  observed_behaviors: z.array(z.string()),
  notes: z.string(),
});

export const ObservationResultSchema = z.object({
  observed_at_iso: z.string(),
  session_duration_minutes: z.number().nullable(),
  setting_notes: z.string(),

  // 5대 영역별 참여도
  area_engagement: z.object({
    practical_life: AreaEngagementSchema,
    sensorial: AreaEngagementSchema,
    language: AreaEngagementSchema,
    mathematics: AreaEngagementSchema,
    cultural: AreaEngagementSchema,
  }),

  // 발달 척도
  developmental_scales: z.object({
    autonomy_initiative: Score,
    concentration_sustainability: Score,
    repetition_consolidation: Score,
    error_self_correction: Score,
    grace_courtesy: Score,
  }),

  // 민감기 신호 (행동 근거 포함)
  sensitive_period_signals: z.array(
    z.object({
      period_name: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
      behavioral_evidence: z.array(z.string()),
      recommended_response: z.string(),
    })
  ),

  // 다음 단계 추천
  recommended_materials: z.array(
    z.object({
      area: z.string(),
      material_name: z.string(),
      rationale: z.string(),
    })
  ),

  // 교사 후속 행동
  follow_up_actions: z.array(z.string()),

  // 전체 요약 (교사용)
  observer_summary: z.string(),

  // 주목 플래그 (즉각 논의 필요 사항)
  attention_flags: z.array(
    z.object({
      flag_type: z.enum(["strength", "concern", "milestone"]),
      description: z.string(),
    })
  ),
});

export type ObservationResult = z.infer<typeof ObservationResultSchema>;

// ── OpenAI Strict JSON Schema (response_format용) ────────────────────────────

const areaEngagementJsonSchema = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 1, maximum: 5 },
    materials_used: { type: "array", items: { type: "string" } },
    observed_behaviors: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
  required: ["score", "materials_used", "observed_behaviors", "notes"],
  additionalProperties: false,
};

export const observationJsonSchema = {
  name: "montessori_observation_result",
  strict: true,
  schema: {
    type: "object",
    properties: {
      observed_at_iso: { type: "string" },
      session_duration_minutes: { type: ["number", "null"] },
      setting_notes: { type: "string" },

      area_engagement: {
        type: "object",
        properties: {
          practical_life: areaEngagementJsonSchema,
          sensorial: areaEngagementJsonSchema,
          language: areaEngagementJsonSchema,
          mathematics: areaEngagementJsonSchema,
          cultural: areaEngagementJsonSchema,
        },
        required: ["practical_life", "sensorial", "language", "mathematics", "cultural"],
        additionalProperties: false,
      },

      developmental_scales: {
        type: "object",
        properties: {
          autonomy_initiative: { type: "integer", minimum: 1, maximum: 5 },
          concentration_sustainability: { type: "integer", minimum: 1, maximum: 5 },
          repetition_consolidation: { type: "integer", minimum: 1, maximum: 5 },
          error_self_correction: { type: "integer", minimum: 1, maximum: 5 },
          grace_courtesy: { type: "integer", minimum: 1, maximum: 5 },
        },
        required: [
          "autonomy_initiative",
          "concentration_sustainability",
          "repetition_consolidation",
          "error_self_correction",
          "grace_courtesy",
        ],
        additionalProperties: false,
      },

      sensitive_period_signals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            period_name: { type: "string" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            behavioral_evidence: { type: "array", items: { type: "string" } },
            recommended_response: { type: "string" },
          },
          required: ["period_name", "confidence", "behavioral_evidence", "recommended_response"],
          additionalProperties: false,
        },
      },

      recommended_materials: {
        type: "array",
        items: {
          type: "object",
          properties: {
            area: { type: "string" },
            material_name: { type: "string" },
            rationale: { type: "string" },
          },
          required: ["area", "material_name", "rationale"],
          additionalProperties: false,
        },
      },

      follow_up_actions: { type: "array", items: { type: "string" } },
      observer_summary: { type: "string" },

      attention_flags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            flag_type: { type: "string", enum: ["strength", "concern", "milestone"] },
            description: { type: "string" },
          },
          required: ["flag_type", "description"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "observed_at_iso",
      "session_duration_minutes",
      "setting_notes",
      "area_engagement",
      "developmental_scales",
      "sensitive_period_signals",
      "recommended_materials",
      "follow_up_actions",
      "observer_summary",
      "attention_flags",
    ],
    additionalProperties: false,
  },
};
