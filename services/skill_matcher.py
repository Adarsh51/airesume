"""
services/skill_matcher.py — Compare resume skills against job requirements.

Performs case-insensitive set operations to find matched / missing skills and
produces a numeric match score with a human-readable recommendation.
"""

from __future__ import annotations


import re

def match_skills(
    resume_skills: list[str],
    required_skills: list[str],
    resume_text: str = "",
) -> dict:
    """
    Compare *resume_skills* to *required_skills* and return a score + details.
    Dynamically searches the raw *resume_text* for any required skills that
    were not explicitly extracted by the parser.

    Parameters
    ----------
    resume_skills : list[str]
        Skills extracted from the candidate's resume.
    required_skills : list[str]
        Skills listed as required in the job posting.
    resume_text : str
        The raw text extracted from the PDF, used as a fallback search.

    Returns
    -------
    dict
        ``{match_score, matched_skills, missing_skills, recommendation}``
    """
    # Normalise both lists → lowercase, stripped, deduplicated
    resume_set = {s.strip().lower() for s in resume_skills if s.strip()}
    required_set = {s.strip().lower() for s in required_skills if s.strip()}

    if not required_set:
        return {
            "match_score": 0.0,
            "matched_skills": [],
            "missing_skills": [],
            "recommendation": "No required skills specified",
        }

    # 1. Base match against extracted skills
    matched_lowercase = resume_set & required_set
    missing_lowercase = required_set - resume_set

    # 2. Dynamic fallback: Search the raw resume text for the missing skills
    text_lower = resume_text.lower()
    still_missing = set()
    
    for missing_skill in missing_lowercase:
        # We can do a simple substring check, or word boundary if it's alphanumeric.
        # Simple substring is safer for complex strings like "Research & Fact Verification"
        if missing_skill in text_lower:
            matched_lowercase.add(missing_skill)
        else:
            still_missing.add(missing_skill)

    # 3. We want to return the original cased versions of the skills for UI display.
    # Map back lowercase required skills to their original casing
    original_casing_map = {s.strip().lower(): s.strip() for s in required_skills if s.strip()}
    
    final_matched = [original_casing_map[s] for s in matched_lowercase]
    final_missing = [original_casing_map[s] for s in still_missing]

    match_score = round((len(final_matched) / len(required_set)) * 100, 1)

    # Determine recommendation band
    if match_score >= 90:
        recommendation = "Highly Recommended"
    elif match_score >= 70:
        recommendation = "Recommended"
    elif match_score >= 50:
        recommendation = "Consider"
    else:
        recommendation = "Not Recommended"

    return {
        "match_score": match_score,
        "matched_skills": sorted(final_matched, key=str.lower),
        "missing_skills": sorted(final_missing, key=str.lower),
        "recommendation": recommendation,
    }
