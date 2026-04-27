import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * OpenAI API 호출 재시도 래퍼
 * 429(Rate Limit), 500/503 서버 오류에 대해 지수 백오프 재시도
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, baseDelayMs = 1000 } = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number }).status;
      const retryable = status === 429 || (status !== undefined && status >= 500);

      if (!retryable || attempt === maxAttempts) throw err;

      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}
