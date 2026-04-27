-- ============================================================
-- SSAEMI AI · 몬테소리 발달 분석 플랫폼 DB 스키마 (Supabase/PostgreSQL)
-- 개선 사항:
--   - 연령 그룹 컬럼 추가
--   - 영역별 점수 정규화 컬럼 (빠른 집계/그래프용)
--   - 발달 척도 정규화 컬럼
--   - 감사 로그 (created_at + updated_at)
--   - RLS(Row Level Security) 정책 기본 틀
--   - 종단 분석용 인덱스
-- ============================================================

-- UUID 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 벡터 검색 (RAG용, 선택)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 교사(가이드) ──────────────────────────────────────────────
CREATE TABLE teachers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  school_name  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 아동 프로필 ───────────────────────────────────────────────
CREATE TABLE child_profiles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id   UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  nickname     TEXT NOT NULL,             -- 개인정보 보호: 실명 대신 닉네임
  birth_year   SMALLINT,                  -- 정확한 생일 불필요
  birth_month  SMALLINT,
  age_group    TEXT NOT NULL CHECK (age_group IN ('3-6', '6-9', '9-12')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 관찰 기록 ─────────────────────────────────────────────────
CREATE TABLE observation_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id        UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  teacher_id      UUID NOT NULL REFERENCES teachers(id),
  age_group       TEXT NOT NULL CHECK (age_group IN ('3-6', '6-9', '9-12')),
  observed_at     TIMESTAMPTZ NOT NULL,
  raw_journal     TEXT,                   -- 원문 (마스킹 후 저장)

  -- 전체 구조화 페이로드 (GPT-4o 출력 원본)
  structured_payload JSONB NOT NULL,

  -- 빠른 집계·그래프용 정규화 컬럼
  -- 5대 영역 점수
  score_practical_life  SMALLINT CHECK (score_practical_life BETWEEN 1 AND 5),
  score_sensorial       SMALLINT CHECK (score_sensorial BETWEEN 1 AND 5),
  score_language        SMALLINT CHECK (score_language BETWEEN 1 AND 5),
  score_mathematics     SMALLINT CHECK (score_mathematics BETWEEN 1 AND 5),
  score_cultural        SMALLINT CHECK (score_cultural BETWEEN 1 AND 5),

  -- 발달 척도
  scale_autonomy        SMALLINT CHECK (scale_autonomy BETWEEN 1 AND 5),
  scale_concentration   SMALLINT CHECK (scale_concentration BETWEEN 1 AND 5),
  scale_repetition      SMALLINT CHECK (scale_repetition BETWEEN 1 AND 5),
  scale_error_correction SMALLINT CHECK (scale_error_correction BETWEEN 1 AND 5),
  scale_grace_courtesy  SMALLINT CHECK (scale_grace_courtesy BETWEEN 1 AND 5),

  -- 민감기 신호 (배열)
  sensitive_periods     TEXT[],

  -- 벡터 임베딩 (RAG / 유사 관찰 검색용, 선택)
  embedding             VECTOR(1536),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 학부모 리포트 ─────────────────────────────────────────────
CREATE TABLE parent_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  observation_id  UUID NOT NULL REFERENCES observation_entries(id) ON DELETE CASCADE,
  child_nickname  TEXT NOT NULL,
  report_payload  JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 인덱스 ────────────────────────────────────────────────────

-- 종단 분석: 아동별 시간순 조회
CREATE INDEX idx_obs_child_time ON observation_entries (child_id, observed_at DESC);

-- 교사별 최근 관찰 조회
CREATE INDEX idx_obs_teacher_time ON observation_entries (teacher_id, observed_at DESC);

-- JSONB 민감기 신호 GIN 검색
CREATE INDEX idx_obs_payload_gin ON observation_entries USING gin (structured_payload);

-- 벡터 유사도 검색 (pgvector IVFFlat)
CREATE INDEX idx_obs_embedding ON observation_entries
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── 자동 updated_at 트리거 ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_child_profiles_updated
  BEFORE UPDATE ON child_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_obs_entries_updated
  BEFORE UPDATE ON observation_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 정규화 컬럼 자동 채우기 트리거 ──────────────────────────
CREATE OR REPLACE FUNCTION populate_score_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.score_practical_life  := (NEW.structured_payload->'area_engagement'->'practical_life'->>'score')::SMALLINT;
  NEW.score_sensorial       := (NEW.structured_payload->'area_engagement'->'sensorial'->>'score')::SMALLINT;
  NEW.score_language        := (NEW.structured_payload->'area_engagement'->'language'->>'score')::SMALLINT;
  NEW.score_mathematics     := (NEW.structured_payload->'area_engagement'->'mathematics'->>'score')::SMALLINT;
  NEW.score_cultural        := (NEW.structured_payload->'area_engagement'->'cultural'->>'score')::SMALLINT;

  NEW.scale_autonomy         := (NEW.structured_payload->'developmental_scales'->>'autonomy_initiative')::SMALLINT;
  NEW.scale_concentration    := (NEW.structured_payload->'developmental_scales'->>'concentration_sustainability')::SMALLINT;
  NEW.scale_repetition       := (NEW.structured_payload->'developmental_scales'->>'repetition_consolidation')::SMALLINT;
  NEW.scale_error_correction := (NEW.structured_payload->'developmental_scales'->>'error_self_correction')::SMALLINT;
  NEW.scale_grace_courtesy   := (NEW.structured_payload->'developmental_scales'->>'grace_courtesy')::SMALLINT;

  -- 민감기 이름 배열 추출
  SELECT ARRAY(
    SELECT elem->>'period_name'
    FROM jsonb_array_elements(NEW.structured_payload->'sensitive_period_signals') AS elem
  ) INTO NEW.sensitive_periods;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_obs_populate_scores
  BEFORE INSERT OR UPDATE OF structured_payload ON observation_entries
  FOR EACH ROW EXECUTE FUNCTION populate_score_columns();

-- ── RLS (Row Level Security) 기본 틀 ─────────────────────────
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_reports ENABLE ROW LEVEL SECURITY;

-- 교사는 자신의 아동 데이터만 접근 (Supabase Auth uid 기반)
CREATE POLICY "teacher_own_children" ON child_profiles
  USING (teacher_id = auth.uid());

CREATE POLICY "teacher_own_observations" ON observation_entries
  USING (teacher_id = auth.uid());

-- ── 종단 분석 뷰 ──────────────────────────────────────────────
CREATE OR REPLACE VIEW v_child_trend AS
SELECT
  child_id,
  observed_at::DATE AS obs_date,
  score_practical_life,
  score_sensorial,
  score_language,
  score_mathematics,
  score_cultural,
  scale_autonomy,
  scale_concentration,
  scale_repetition,
  scale_error_correction,
  scale_grace_courtesy,
  ROUND(
    (score_practical_life + score_sensorial + score_language + score_mathematics + score_cultural)::NUMERIC / 5, 2
  ) AS avg_area_score,
  ROUND(
    (scale_autonomy + scale_concentration + scale_repetition + scale_error_correction + scale_grace_courtesy)::NUMERIC / 5, 2
  ) AS avg_dev_scale
FROM observation_entries
ORDER BY child_id, observed_at;
