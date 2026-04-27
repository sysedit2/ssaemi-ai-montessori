import { NextRequest } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OpenAI API 키가 설정되지 않았습니다." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "FormData 파싱 실패" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "file 필드가 필요합니다." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "파일이 25MB를 초과합니다." }, { status: 413 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const audioFile = await toFile(file, "recording.webm", { type: file.type });
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ko",
      response_format: "text",
    });
    return Response.json({ text: transcription });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    return Response.json({ error: "음성 전사 실패" }, { status });
  }
}
