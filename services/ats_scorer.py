"""
services/ats_scorer.py — Applicant Tracking System (ATS) resume quality scorer.

Checks the resume text for the presence of key sections that most ATS
systems look for, and awards points for each section found.
"""

from __future__ import annotations
from typing import Any


def calculate_ats_score(
    resume_text: str,
    candidate_name: str | None,
    email: str | None,
) -> dict[str, Any]:
    """
    Score a resume on a 0–100 scale based on commonly expected ATS sections.

    Each of the five checks is worth **20 points**:

    1. **Name present** — candidate_name is not None / empty.
    2. **Email present** — email is not None / empty.
    3. **Skills section** — resume text contains "skill", "skills", or
       "technical skills".
    4. **Education section** — resume text contains "education" or
       "academic".
    5. **Experience section** — resume text contains "experience",
       "work experience", or "employment".

    Returns
    -------
    dict
        ``{ats_score: float, checks: [{name, passed, points}]}``
    """
    text_lower = resume_text.lower() if resume_text else ""

    checks: list[dict[str, Any]] = []

    # 1. Name
    has_name = bool(candidate_name and candidate_name.strip())
    checks.append({
        "name": "Contact Name",
        "passed": has_name,
        "points": 20 if has_name else 0,
    })

    # 2. Email
    has_email = bool(email and email.strip())
    checks.append({
        "name": "Contact Email",
        "passed": has_email,
        "points": 20 if has_email else 0,
    })

    # 3. Skills section
    skills_keywords = ["technical skills", "skills", "skill"]
    has_skills = any(kw in text_lower for kw in skills_keywords)
    checks.append({
        "name": "Skills Section",
        "passed": has_skills,
        "points": 20 if has_skills else 0,
    })

    # 4. Education section
    education_keywords = ["education", "academic"]
    has_education = any(kw in text_lower for kw in education_keywords)
    checks.append({
        "name": "Education Section",
        "passed": has_education,
        "points": 20 if has_education else 0,
    })

    # 5. Experience section
    experience_keywords = ["work experience", "experience", "employment"]
    has_experience = any(kw in text_lower for kw in experience_keywords)
    checks.append({
        "name": "Experience Section",
        "passed": has_experience,
        "points": 20 if has_experience else 0,
    })

    ats_score = sum(check["points"] for check in checks)

    return {
        "ats_score": float(ats_score),
        "checks": checks,
    }
