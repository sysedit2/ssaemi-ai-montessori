import { NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { PARENT_REPORT_PROMPT } from "@/lib/prompts";
import { ObservationResultSchema } from "@/lib/observation-schema";

const RequestSchema = z.object({
  analysisResult: ObservationResultSchema,
  childNickname: z.string().max(20).optional().default("우리 아이"),
  observationDate: z.string().optional(),
});

const ParentReportSchema = z.object({
  greeting_paragraph: z.string(),
  strengths: z.array(z.string()),
  growth_areas: z.array(z.string()),
  home_support_tips: z.array(z.string()),
  closing_paragraph: z.string(),
  next_observation_focus: z.string(),
});

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OpenAI API 키가 설정되지 않았습니다." }, { status: 503 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "유효하지 않은 JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "입력 오류", details: parsed.error.flatten() }, { status: 400 });
  }

  const { analysisResult, childNickname, observationDate } = parsed.data;
  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      messages: [
        { role: "system", content: PARENT_REPORT_PROMPT },
        {
          role: "user",
          content: [
            `아동 호칭: ${childNickname}`,
            observationDate ? `관찰 일자: ${observationDate}` : "",
            "",
            "## 발달 분석 데이터",
            JSON.stringify(analysisResult, null, 2),
          ].filter(Boolean).join("\n"),
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const reportParsed = ParentReportSchema.safeParse(JSON.parse(raw));
    if (!reportParsed.success) {
      return Response.json({ error: "리포트 스키마 오류" }, { status: 502 });
    }
    return Response.json({ report: reportParsed.data });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    return Response.json({ error: "리포트 생성 실패" }, { status });
  }
}
