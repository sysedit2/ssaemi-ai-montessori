import { NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { buildSystemPrompt, type AgeGroup } from "@/lib/prompts";
import { observationJsonSchema, ObservationResultSchema } from "@/lib/observation-schema";
import { maskPiiForModel, auditMaskingResult } from "@/lib/pii-mask";

const RequestSchema = z.object({
  journalText: z.string().min(10, "관찰일지가 너무 짧습니다 (최소 10자)").max(8000),
  piiTokens: z.array(z.string()).optional().default([]),
  ageGroup: z.enum(["3-6", "6-9", "9-12"]).optional().default("3-6"),
  childId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // 1. 입력 검증
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "유효하지 않은 JSON 형식입니다." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "입력 오류", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { journalText, piiTokens, ageGroup, childId } = parsed.data;

  // 2. API 키 확인
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OpenAI API 키가 설정되지 않았습니다. .env.local 파일에 OPENAI_API_KEY를 추가해주세요." },
      { status: 503 }
    );
  }

  // 3. PII 마스킹
  const maskedJournal = maskPiiForModel(journalText, piiTokens);
  const maskWarnings = auditMaskingResult(maskedJournal, journalText);

  // 4. OpenAI 분석 (재시도 포함)
  const openai = new OpenAI({ apiKey });
  let rawResult = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.2,
        messages: [
          { role: "system", content: buildSystemPrompt(ageGroup as AgeGroup) },
          {
            role: "user",
            content: `다음은 PII가 마스킹된 ${ageGroup}세 아동 관찰일지입니다. 스키마에 맞게 분석하세요.\n\n---\n${maskedJournal}\n---`,
          },
        ],
        response_format: {
          type: "json_schema",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          json_schema: observationJsonSchema as any,
        },
      });
      rawResult = completion.choices[0]?.message?.content ?? "";
      break;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (attempt === 3 || (status !== 429 && (status === undefined || status < 500))) {
        const msg =
          status === 429 ? "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." :
          status === 401 ? "API 키가 유효하지 않습니다." :
          "GPT-4o 분석 중 오류가 발생했습니다.";
        return Response.json({ error: msg }, { status: status ?? 500 });
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  // 5. 응답 검증
  let jsonData: unknown;
  try {
    jsonData = JSON.parse(rawResult);
  } catch {
    return Response.json({ error: "AI 응답 파싱 실패" }, { status: 502 });
  }

  const validated = ObservationResultSchema.safeParse(jsonData);
  if (!validated.success) {
    return Response.json(
      { error: "AI 응답 스키마 불일치", details: validated.error.flatten() },
      { status: 502 }
    );
  }

  return Response.json({
    result: validated.data,
    childId: childId ?? null,
    ageGroup,
    maskWarnings: maskWarnings.length > 0 ? maskWarnings : undefined,
  });
}
