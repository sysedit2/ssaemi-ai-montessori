import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { ObservationResultSchema } from "@/lib/observation-schema";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수 미설정");
  return createClient(url, key);
}

// 관찰 저장
const SaveSchema = z.object({
  childId: z.string().uuid(),
  ageGroup: z.enum(["3-6", "6-9", "9-12"]),
  rawJournal: z.string().max(8000),
  result: ObservationResultSchema,
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "유효하지 않은 JSON" }, { status: 400 });
  }

  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "입력 오류", details: parsed.error.flatten() }, { status: 400 });
  }

  const { childId, ageGroup, rawJournal, result } = parsed.data;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("observation_entries")
    .insert({
      child_id: childId,
      age_group: ageGroup,
      raw_journal: rawJournal,
      structured_payload: result,
      observed_at: result.observed_at_iso,
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: "저장 실패", detail: error.message }, { status: 500 });
  }

  return Response.json({ id: data.id }, { status: 201 });
}

// 아동별 관찰 목록 조회 (종단 분석용)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  if (!childId) {
    return Response.json({ error: "childId 파라미터가 필요합니다." }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("observation_entries")
    .select("id, observed_at, structured_payload, age_group")
    .eq("child_id", childId)
    .order("observed_at", { ascending: true })
    .limit(limit);

  if (error) {
    return Response.json({ error: "조회 실패", detail: error.message }, { status: 500 });
  }

  return Response.json({ observations: data });
}
