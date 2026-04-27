import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수 미설정");
  return createClient(url, key);
}

const CreateChildSchema = z.object({
  nickname: z.string().min(1).max(20),
  ageGroup: z.enum(["3-6", "6-9", "9-12"]),
  birthYear: z.number().int().min(2010).max(2025).optional(),
  birthMonth: z.number().int().min(1).max(12).optional(),
  notes: z.string().max(500).optional(),
  teacherId: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");
  if (!teacherId) {
    return Response.json({ error: "teacherId 파라미터 필요" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("child_profiles")
    .select("id, nickname, age_group, birth_year, birth_month, notes, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ children: data });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "유효하지 않은 JSON" }, { status: 400 });
  }

  const parsed = CreateChildSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "입력 오류", details: parsed.error.flatten() }, { status: 400 });
  }

  const { nickname, ageGroup, birthYear, birthMonth, notes, teacherId } = parsed.data;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("child_profiles")
    .insert({
      nickname,
      age_group: ageGroup,
      birth_year: birthYear ?? null,
      birth_month: birthMonth ?? null,
      notes: notes ?? null,
      teacher_id: teacherId,
    })
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id }, { status: 201 });
}
