/**
 * 개선된 한국어 PII 마스킹
 *
 * 기존 문제:
 *  - 몬테소리 교구명(핑크 타워, 골든 비드 등)이 한글 2-4자 규칙에 걸려 마스킹됨
 *  - 주민번호 패턴 없음
 *  - 복합 이름(외국 이름 한글 표기) 미처리
 *
 * 개선:
 *  - 교구명 화이트리스트 (마스킹 제외)
 *  - 한국 전화번호 패턴 추가
 *  - 보호자 관계 표현 마스킹 (예: "민준이 엄마가")
 *  - 마스킹 적용 전 화이트리스트 토큰 임시 치환 → 복원
 */

// 몬테소리 교구명·고유명사 화이트리스트 (마스킹에서 제외)
const MONTESSORI_WHITELIST = new Set([
  "핑크타워", "핑크 타워",
  "갈색계단", "갈색 계단",
  "빨간막대", "빨간 막대",
  "골든비드", "골든 비드",
  "샌드페이퍼",
  "스핀들박스", "스핀들 박스",
  "숫자막대", "숫자 막대",
  "지오보드",
  "비노미얼큐브", "비노미얼 큐브",
  "트리노미얼큐브",
  "메탈인서트", "메탈 인서트",
  "무빙알파벳", "무빙 알파벳",
  "샌드페이퍼글자",
  "스탬프게임", "스탬프 게임",
  "뱅크게임", "뱅크 게임",
  "그레이스앤커티시",
  "체인", "비드체인",
  "지구본", "대륙퍼즐",
  "보타닉", "동물학", "기하캐비닛",
  "몬테소리",
]);

// 이름이 아닌 일반 한글 단어 (과마스킹 방지 샘플)
const COMMON_NOUNS = new Set([
  "선생님", "교사", "아동", "친구", "교실", "활동", "작업", "오늘", "어제",
  "오전", "오후", "시간", "학교", "유치원", "어린이집", "부모", "엄마", "아빠",
  "형", "누나", "언니", "오빠", "동생", "그룹", "환경", "정리", "준비",
  "참여", "관찰", "집중", "반복", "수업", "놀이", "발달", "성장",
]);

// 이름 뒤에 자주 붙는 조사/접미사 (이름 탐지 보조)
const NAME_SUFFIXES = ["이", "가", "은", "는", "이가", "이는", "의", "에게", "한테", "와", "과"];

function buildSuffixPattern(): RegExp {
  const suffixes = NAME_SUFFIXES.join("|");
  // 한글 2-4자 이름 + 조사
  return new RegExp(`([가-힣]{2,4})(${suffixes})(?=[\\s,。.!?])`, "g");
}

function isWhitelisted(token: string): boolean {
  if (MONTESSORI_WHITELIST.has(token)) return true;
  if (COMMON_NOUNS.has(token)) return true;
  return false;
}

function replaceWhitelistWithPlaceholders(text: string): {
  masked: string;
  restore: Map<string, string>;
} {
  const restore = new Map<string, string>();
  let masked = text;
  let idx = 0;

  for (const term of MONTESSORI_WHITELIST) {
    if (masked.includes(term)) {
      const placeholder = `__WL${idx++}__`;
      restore.set(placeholder, term);
      masked = masked.split(term).join(placeholder);
    }
  }

  return { masked, restore };
}

function restorePlaceholders(text: string, restore: Map<string, string>): string {
  let result = text;
  for (const [placeholder, original] of restore) {
    result = result.split(placeholder).join(original);
  }
  return result;
}

export function maskPiiForModel(raw: string, extraTokens: string[] = []): string {
  // 1단계: 화이트리스트 토큰 임시 치환
  const { masked: step1, restore } = replaceWhitelistWithPlaceholders(raw);

  let text = step1;

  // 2단계: 추가 토큰(교사가 명시한 실명 등)
  for (const token of extraTokens) {
    if (token.trim()) {
      text = text.split(token.trim()).join("[REDACTED]");
    }
  }

  // 3단계: 이메일
  text = text.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");

  // 4단계: 전화번호 (한국 010/02/031 등)
  text = text.replace(/(?:010|011|016|017|018|019|02|0[3-9]\d)-?\d{3,4}-?\d{4}/g, "[REDACTED_PHONE]");

  // 5단계: 주민등록번호 형식
  text = text.replace(/\d{6}-[1-4]\d{6}/g, "[REDACTED_RRN]");

  // 6단계: 한글 이름 + 조사 패턴 (화이트리스트 제외 후 적용)
  const namePattern = buildSuffixPattern();
  text = text.replace(namePattern, (match, name, suffix) => {
    if (isWhitelisted(name)) return match;
    // 글자 수 2-4, 첫 글자 성씨 범위 (간단 휴리스틱)
    return `[REDACTED]${suffix}`;
  });

  // 7단계: 화이트리스트 복원
  text = restorePlaceholders(text, restore);

  return text;
}

// 분석 결과에서 특정 이름이 살아남았는지 사후 검증
export function auditMaskingResult(masked: string, original: string): string[] {
  const warnings: string[] = [];
  const namePattern = /[가-힣]{2,4}(?:이가|이는|의|에게)/g;
  const survivors = [...masked.matchAll(namePattern)].map((m) => m[0]);
  for (const s of survivors) {
    if (!isWhitelisted(s.replace(/이가|이는|의|에게/, ""))) {
      warnings.push(`잠재적 미마스킹 이름: "${s}"`);
    }
  }
  return warnings;
}
