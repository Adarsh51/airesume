"""
database/db_operations.py — CRUD helpers for jobs, resumes, and screening results.

Every public function talks to Supabase through the shared client created in
`supabase_client.py`.  All functions are wrapped in try/except so callers
receive a clear error message instead of an unhandled exception.
"""

from __future__ import annotations
from typing import Any
from database.supabase_client import supabase


# ── helpers ──────────────────────────────────────────────────────────────────

def _require_client() -> None:
    """Raise RuntimeError when the Supabase client is not available."""
    if supabase is None:
        raise RuntimeError(
            "Supabase client is not initialised. "
            "Make sure SUPABASE_URL and SUPABASE_KEY are set in your .env file."
        )


# ── Jobs ─────────────────────────────────────────────────────────────────────

def save_job(title: str, description: str, required_skills: str) -> dict[str, Any]:
    """Insert a new job posting and return the created row (including its id)."""
    try:
        _require_client()
        response = (
            supabase.table("jobs")
            .insert({
                "title": title,
                "description": description,
                "required_skills": required_skills,
            })
            .execute()
        )
        return response.data[0]
    except Exception as exc:
        raise RuntimeError(f"Failed to save job: {exc}") from exc


def get_jobs() -> list[dict[str, Any]]:
    """Return every job, newest first."""
    try:
        _require_client()
        response = (
            supabase.table("jobs")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch jobs: {exc}") from exc


def get_job(job_id: str) -> dict[str, Any] | None:
    """Return a single job by its UUID, or None if not found."""
    try:
        _require_client()
        response = (
            supabase.table("jobs")
            .select("*")
            .eq("id", job_id)
            .execute()
        )
        return response.data[0] if response.data else None
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch job {job_id}: {exc}") from exc


def delete_job(job_id: str) -> None:
    """Delete a job and all its associated resumes."""
    try:
        _require_client()
        # Delete associated resumes first
        supabase.table("resumes").delete().eq("job_id", job_id).execute()
        # Delete the job
        supabase.table("jobs").delete().eq("id", job_id).execute()
    except Exception as exc:
        raise RuntimeError(f"Failed to delete job {job_id}: {exc}") from exc


# ── Resumes ──────────────────────────────────────────────────────────────────

def save_resume(
    candidate_name: str,
    email: str | None,
    phone: str | None,
    resume_text: str,
    skills: str,
    job_id: str | None = None,
) -> dict[str, Any]:
    """Insert a parsed resume record and return the created row."""
    try:
        _require_client()
        response = (
            supabase.table("resumes")
            .insert({
                "candidate_name": candidate_name,
                "email": email,
                "phone": phone,
                "resume_text": resume_text,
                "skills": skills,
                "job_id": job_id,
            })
            .execute()
        )
        return response.data[0]
    except Exception as exc:
        raise RuntimeError(f"Failed to save resume: {exc}") from exc


def get_resumes_by_job(job_id: str) -> list[dict[str, Any]]:
    """Return all resumes linked to a specific job."""
    try:
        _require_client()
        response = (
            supabase.table("resumes")
            .select("*")
            .eq("job_id", job_id)
            .order("uploaded_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch resumes for job {job_id}: {exc}") from exc


def get_all_resumes() -> list[dict[str, Any]]:
    """Return all resumes from the talent pool."""
    try:
        _require_client()
        response = (
            supabase.table("resumes")
            .select("*")
            .order("uploaded_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch resumes: {exc}") from exc


def update_resume_status(resume_id: str, status: str) -> dict[str, Any]:
    """Update the status of a resume (pending, accepted, rejected)."""
    try:
        _require_client()
        response = (
            supabase.table("resumes")
            .update({"status": status})
            .eq("id", resume_id)
            .execute()
        )
        if not response.data:
            raise RuntimeError(f"Resume {resume_id} not found.")
        return response.data[0]
    except Exception as exc:
        raise RuntimeError(f"Failed to update resume status: {exc}") from exc


def get_applications_by_email(email: str) -> list[dict[str, Any]]:
    """Return all resume applications for a given email, with job info."""
    try:
        _require_client()
        response = (
            supabase.table("resumes")
            .select("id, candidate_name, email, status, uploaded_at, job_id, jobs(title)")
            .eq("email", email)
            .order("uploaded_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch applications for {email}: {exc}") from exc


# ── Screening Results ────────────────────────────────────────────────────────

def save_result(
    resume_id: str,
    job_id: str,
    match_score: float,
    ats_score: float,
    matched_skills: str,
    missing_skills: str,
    recommendation: str,
) -> dict[str, Any]:
    """Insert a screening-result record and return the created row."""
    try:
        _require_client()
        response = (
            supabase.table("screening_results")
            .insert({
                "resume_id": resume_id,
                "job_id": job_id,
                "match_score": match_score,
                "ats_score": ats_score,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "recommendation": recommendation,
            })
            .execute()
        )
        return response.data[0]
    except Exception as exc:
        raise RuntimeError(f"Failed to save screening result: {exc}") from exc


def get_result(result_id: str) -> dict[str, Any] | None:
    """Return a single result with its related resume and job rows joined."""
    try:
        _require_client()
        response = (
            supabase.table("screening_results")
            .select("*, resumes(*), jobs(*)")
            .eq("id", result_id)
            .execute()
        )
        return response.data[0] if response.data else None
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch result {result_id}: {exc}") from exc


def get_all_results(
    search: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> list[dict[str, Any]]:
    """
    Return screening results with optional filtering and sorting.

    Parameters
    ----------
    search : str, optional
        If provided, only results whose linked candidate name contains
        this substring (case-insensitive) are returned.
    sort_by : str
        Column to sort on (default ``created_at``).
    sort_order : str
        ``'asc'`` or ``'desc'`` (default ``'desc'``).
    """
    try:
        _require_client()
        query = supabase.table("screening_results").select("*, resumes(*), jobs(*)")

        # Apply search filter on the joined candidate_name via resumes
        if search:
            query = query.ilike("resumes.candidate_name", f"%{search}%")

        # Sorting
        descending = sort_order.lower() == "desc"
        query = query.order(sort_by, desc=descending)

        response = query.execute()
        return response.data
    except Exception as exc:
        raise RuntimeError(f"Failed to fetch results: {exc}") from exc
