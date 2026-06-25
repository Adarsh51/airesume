"""
app.py — Main Flask application for ResumeMatch AI.
"""

from __future__ import annotations

import os
from dotenv import load_dotenv

# Load .env before any other app-level import so config picks up the values
load_dotenv()

from flask import (
    Flask,
    jsonify,
    render_template,
    request,
    Response,
    session,
    redirect,
    url_for,
    flash,
)
from flask_cors import CORS

from config import ALLOWED_EXTENSIONS, MAX_CONTENT_LENGTH, UPLOAD_FOLDER
from database.db_operations import (
    delete_job,
    get_job,
    get_jobs,
    save_job,
    save_resume,
    get_all_resumes,
    get_resumes_by_job,
    update_resume_status,
    get_applications_by_email,
)
from services.pdf_parser import parse_resume
from services.skill_matcher import match_skills

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates",
)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.secret_key = os.environ.get("SECRET_KEY", os.urandom(24))

CORS(app)  # allow all origins for development


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _allowed_file(filename: str) -> bool:
    """Return True if *filename* has an allowed extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _error(message: str, status_code: int = 400):
    """Return a JSON error response."""
    return jsonify({"error": message}), status_code


# ---------------------------------------------------------------------------
# Admin Authentication
# ---------------------------------------------------------------------------

from functools import wraps

def requires_auth(f):
    """Decorator to require session login for an admin route."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login"))
        return f(*args, **kwargs)
    return decorated


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    """Custom login page for admin."""
    if request.method == "POST":
        # In a real app, you would check a database or hashed password.
        password = request.form.get("password", "")
        if password == "password123":
            session["admin_logged_in"] = True
            return redirect(url_for("admin"))
        else:
            flash("Invalid password", "error")
            
    return render_template("login.html")

@app.route("/admin/logout")
def admin_logout():
    """Clear session and redirect to login."""
    session.clear()
    return redirect(url_for("admin_login"))


# ---------------------------------------------------------------------------
# Template (page) routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Landing page - Gateway to portals."""
    return render_template("index.html")

@app.route("/candidate")
def candidate():
    """Candidate portal."""
    return render_template("candidate.html")

@app.route("/admin")
@requires_auth
def admin():
    """Admin dashboard."""
    return render_template("admin.html")

@app.route("/admin/jobs/<job_id>")
@requires_auth
def admin_job(job_id: str):
    """Admin job details with candidate rankings."""
    return render_template("admin_job.html", job_id=job_id)


# ---------------------------------------------------------------------------
# API routes — Jobs
# ---------------------------------------------------------------------------

@app.route("/api/jobs", methods=["POST"])
def api_create_job():
    """
    Create a new job posting.
    Expects JSON: {title, description, required_skills}
    """
    data = request.get_json(silent=True)
    if not data:
        return _error("Request body must be JSON.")

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    required_skills = data.get("required_skills", "").strip()

    if not title:
        return _error("Job title is required.")
    if not required_skills:
        return _error("Required skills are required.")

    try:
        job = save_job(title, description, required_skills)
        return jsonify({"message": "Job created successfully", "job": job}), 201
    except RuntimeError as exc:
        return _error(str(exc), 500)

@app.route("/api/jobs", methods=["GET"])
def api_get_jobs():
    """Return all job postings, newest first."""
    try:
        jobs = get_jobs()
        return jsonify({"jobs": jobs}), 200
    except RuntimeError as exc:
        return _error(str(exc), 500)

@app.route("/api/jobs/<job_id>", methods=["DELETE"])
def api_delete_job(job_id: str):
    """Delete a job posting and all associated resumes."""
    try:
        delete_job(job_id)
        return jsonify({"message": "Job deleted successfully"}), 200
    except RuntimeError as exc:
        return _error(str(exc), 500)


# ---------------------------------------------------------------------------
# API routes — Candidate Upload
# ---------------------------------------------------------------------------

@app.route("/api/candidate/upload", methods=["POST"])
def api_candidate_upload():
    """
    Candidate uploads resume. Extracted data + manual overrides.
    Expects multipart/form-data: file, name, email, phone.
    """
    if "file" not in request.files:
        return _error("No file provided.")

    file = request.files["file"]
    name_override = request.form.get("name", "").strip()
    email_override = request.form.get("email", "").strip()
    phone_override = request.form.get("phone", "").strip()
    job_id = request.form.get("job_id", "").strip()

    if not job_id:
        return _error("Please select a job to apply for.")

    if file.filename == "" or file.filename is None:
        return _error("No file selected.")

    if not _allowed_file(file.filename):
        return _error("Only PDF files are allowed.")

    try:
        file_bytes = file.read()
        if not file_bytes:
            return _error("Uploaded file is empty.")

        parsed = parse_resume(file_bytes)

        # Override with manual inputs if provided
        final_name = name_override if name_override else parsed["candidate_name"]
        final_email = email_override if email_override else parsed["email"]
        final_phone = phone_override if phone_override else None

        skills_csv = ", ".join(parsed["skills"])
        resume_record = save_resume(
            candidate_name=final_name,
            email=final_email,
            phone=final_phone,
            resume_text=parsed["resume_text"],
            skills=skills_csv,
            job_id=job_id,
        )

        return jsonify({
            "message": "Resume uploaded successfully",
            "resume_id": resume_record["id"]
        }), 201

    except ValueError as exc:
        return _error(str(exc), 422)
    except RuntimeError as exc:
        return _error(str(exc), 500)


# ---------------------------------------------------------------------------
# API routes — Admin Rankings
# ---------------------------------------------------------------------------

@app.route("/api/admin/jobs/<job_id>/rankings", methods=["GET"])
def api_get_rankings(job_id: str):
    """
    Dynamically fetch all candidates in the global pool, score them against
    the specified job_id, and return a sorted list of rankings.
    """
    try:
        job = get_job(job_id)
        if not job:
            return _error("Job not found.", 404)
        
        required_skills = [s.strip() for s in (job.get("required_skills") or "").split(",") if s.strip()]
        
        resumes = get_resumes_by_job(job_id)
        rankings = []

        for resume in resumes:
            resume_skills = [s.strip() for s in (resume.get("skills") or "").split(",") if s.strip()]
            
            # Match skills dynamically against both extracted skills and raw text
            match_result = match_skills(
                resume_skills,
                required_skills,
                resume.get("resume_text", "")
            )
            
            rankings.append({
                "resume_id": resume["id"],
                "candidate_name": resume.get("candidate_name", "Unknown"),
                "email": resume.get("email"),
                "phone": resume.get("phone"),
                "uploaded_at": resume.get("uploaded_at"),
                "match_score": match_result["match_score"],
                "matched_skills": match_result["matched_skills"],
                "missing_skills": match_result["missing_skills"],
                "recommendation": match_result["recommendation"],
                "status": resume.get("status", "pending"),
            })
            
        # Sort by match_score descending
        rankings.sort(key=lambda x: x["match_score"], reverse=True)
        
        return jsonify({
            "job": job,
            "rankings": rankings
        }), 200

    except RuntimeError as exc:
        return _error(str(exc), 500)


@app.route("/api/admin/resumes/<resume_id>/status", methods=["PATCH"])
def api_update_resume_status(resume_id: str):
    """Accept or reject a candidate."""
    data = request.get_json(silent=True)
    if not data:
        return _error("Request body must be JSON.")
    
    status = data.get("status", "").strip().lower()
    if status not in ("accepted", "rejected", "pending"):
        return _error("Status must be 'accepted', 'rejected', or 'pending'.")
    
    try:
        updated = update_resume_status(resume_id, status)
        return jsonify({"message": f"Candidate {status}", "resume": updated}), 200
    except RuntimeError as exc:
        return _error(str(exc), 500)


@app.route("/api/candidate/status", methods=["GET"])
def api_candidate_status():
    """Return all applications for a given email."""
    email = request.args.get("email", "").strip()
    if not email:
        return _error("Email is required.")
    
    try:
        applications = get_applications_by_email(email)
        return jsonify({"applications": applications}), 200
    except RuntimeError as exc:
        return _error(str(exc), 500)


# ---------------------------------------------------------------------------
# Generic error handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(413)
def request_entity_too_large(_error):
    return jsonify({"error": "File too large. Maximum size is 10 MB."}), 413

@app.errorhandler(500)
def internal_server_error(_error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
