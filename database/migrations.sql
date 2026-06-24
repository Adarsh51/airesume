-- ==========================================================================
-- ResumeMatch AI — Database Migration
-- Run this SQL in your Supabase SQL Editor to create the required tables.
-- ==========================================================================

-- 1. Jobs table — stores job postings with required skills
CREATE TABLE IF NOT EXISTS jobs (
    id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
    title       TEXT          NOT NULL,
    description TEXT,
    required_skills TEXT      NOT NULL,
    created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- 2. Resumes table — stores parsed resume data
CREATE TABLE IF NOT EXISTS resumes (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    candidate_name  TEXT,
    email           TEXT,
    phone           TEXT,
    resume_text     TEXT,
    skills          TEXT,
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Screening results table — stores matching / ATS scores per resume–job pair
CREATE TABLE IF NOT EXISTS screening_results (
    id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
    resume_id       UUID    REFERENCES resumes(id),
    job_id          UUID    REFERENCES jobs(id),
    match_score     FLOAT,
    ats_score       FLOAT,
    matched_skills  TEXT,
    missing_skills  TEXT,
    recommendation  TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: enable Row Level Security (RLS) if needed
-- ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE screening_results ENABLE ROW LEVEL SECURITY;
