/**
 * POST /api/dual-analyze
 * Gemma 4 (좌) + GPT-4o Evals (우) 병렬 실행
 * 두 엔진 결과를 합쳐 LOMS HolisticReport 반환
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { maskPiiForModel } from "@/lib/pii-mask";
import { analyzeWithGemma } from "@/lib/gemma-connector";
import {
  GEMMA_SYSTEM_PROMPT, buildGemmaUserPrompt,
  GPT4O_LOMS_SYSTEM_PROMPT, buildGPT4OEvalsPrompt,
} from "@/lib/loms-prompts";
import { GemmaRawLogSchema, EvalsResultSchema } from "@/lib/loms-schema";
import type { GemmaRawLog, EvalsResult } from "@/lib/loms-schema";

const RequestSchema = z.object({
  journalText:  z.string().min(10).max(8000),
  piiTokens:    z.array(z.string()).optional().default([]),
  ageGroup:     z.enum(["3-6","6-9","9-12"]).optional().default("3-6"),
  childNickname:z.string().optional().default("아동"),
  childAge:     z.number().int().min(2).max(13).optional().default(5),
  institution:  z.string().optional().default("Ssaemi-ai Center"),
  period:       z.object({ from: z.string(), to: z.string() }).optional(),
});

const GPT4O_EVALS_SCHEMA = {
  name: "loms_evals_result",
  strict: true,
  schema: {
    type: "object",
    properties: {
      inference_accuracy:    { type: "number" },
      montessori_alignment:  { type: "number" },
      observer_tone_score:   { type: "number" },
      persistence_insight:   { type: "string" },
      flow_insight:          { type: "string" },
      autonomy_insight:      { type: "string" },
      critical_moment_late:  { type: "string" },
      strategic_recommendation: { type: "string" },
      next_material_readiness_pct: { type: "number" },
      next_material_name:    { type: "string" },
      home_guide_message:    { type: "string" },
      rubric_scores: {
        type: "object",
        properties: {
          area_classification:         { type: "number" },
          sensitive_period_detection:  { type: "number" },
          developmental_inference:     { type: "number" },
          language_appropriateness:    { type: "number" },
          actionability:               { type: "number" },
        },
        required: ["area_classification","sensitive_period_detection","developmental_inference","language_appropriateness","actionability"],
        additionalProperties: false,
      },
      eval_ms: { type: "number" },
    },
    required: ["inference_accuracy","montessori_alignment","observer_tone_score",
      "persistence_insight","flow_insight","autonomy_insight",
      "critical_moment_late","strategic_recommendation",
      "next_material_readiness_pct","next_material_name",
      "home_guide_message","rubric_scores","eval_ms"],
    additionalProperties: false,
  },
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "OPENAI_API_KEY 미설정" }, { status: 503 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "유효하지 않은 JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "입력 오류", details: parsed.error.flatten() }, { status: 400 });

  const { journalText, piiTokens, ageGroup, childNickname, childAge, institution, period } = parsed.data;
  const maskedJournal = maskPiiForModel(journalText, piiTokens);
  const pipelineStart = Date.now();

  // ── 병렬 실행: Gemma 4 + GPT-4o ──────────────────────────
  const [gemmaResult, gptRaw] = await Promise.all([
    // 좌: Gemma 4
    analyzeWithGemma(
      GEMMA_SYSTEM_PROMPT,
      buildGemmaUserPrompt(maskedJournal, ageGroup),
      maskedJournal,
      ageGroup
    ),
    // 우: GPT-4o Evals (Gemma 결과 없이 저널만으로 먼저 요청)
    (async (): Promise<string> => {
      const evalStart = Date.now();
      const openai = new OpenAI({ apiKey });
      // Gemma 결과가 아직 없으므로 저널 직접 평가 (병렬 최적화)
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.15,
        messages: [
          { role: "system", content: GPT4O_LOMS_SYSTEM_PROMPT },
          { role: "user",   content: buildGPT4OEvalsPrompt("(분석 중 - 원본 저널 직접 평가)", maskedJournal, ageGroup) },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response_format: { type: "json_schema", json_schema: GPT4O_EVALS_SCHEMA as any },
      });
      const content = completion.choices[0]?.message?.content ?? "{}";
      const obj = JSON.parse(content);
      obj.eval_ms = Date.now() - evalStart;
      return JSON.stringify(obj);
    })(),
  ]);

  // GPT-4o 결과 파싱
  let evalsObj: Record<string, unknown>;
  try { evalsObj = JSON.parse(gptRaw); }
  catch { return Response.json({ error: "GPT-4o 응답 파싱 실패" }, { status: 502 }); }

  const evalsData: EvalsResult = {
    engine: "openai-evals-gpt4o",
    model_version: "gpt-4o-2024-11-20",
    ...evalsObj,
  } as EvalsResult;

  // Zod 검증
  const gemmaVal = GemmaRawLogSchema.safeParse(gemmaResult);
  const evalsVal = EvalsResultSchema.safeParse(evalsData);

  if (!gemmaVal.success) return Response.json({ error: "Gemma 스키마 오류", details: gemmaVal.error.flatten() }, { status: 502 });
  if (!evalsVal.success) return Response.json({ error: "Evals 스키마 오류", details: evalsVal.error.flatten() }, { status: 502 });

  const now = new Date().toISOString();
  return Response.json({
    report_id: crypto.randomUUID(),
    generated_at: now,
    period: period ?? { from: now.slice(0,10), to: now.slice(0,10) },
    child_nickname: childNickname,
    child_age: childAge,
    institution,
    gemma: gemmaVal.data,
    evals: evalsVal.data,
    total_pipeline_ms: Date.now() - pipelineStart,
  });
}
