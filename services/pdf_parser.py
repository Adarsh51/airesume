"""
services/pdf_parser.py — Extract structured data from a PDF resume.

Uses *pdfplumber* for text extraction and regex / keyword matching to
pull out the candidate's name, email, and skills.
"""

from __future__ import annotations

import re
from io import BytesIO
from typing import Any

import pdfplumber

# ---------------------------------------------------------------------------
# Comprehensive skills database (120+ entries)
# ---------------------------------------------------------------------------
SKILLS_DATABASE: list[str] = [
    # Programming languages
    "Python", "Java", "JavaScript", "TypeScript", "C", "C++", "C#",
    "Ruby", "PHP", "Swift", "Kotlin", "Go", "Rust", "R", "Scala",
    "Perl", "Dart", "Lua", "MATLAB", "Shell Scripting", "Bash",
    # Frontend
    "HTML", "CSS", "React", "Angular", "Vue", "Svelte", "Next.js",
    "Tailwind", "Bootstrap", "jQuery", "SASS", "LESS", "Webpack",
    # Backend frameworks
    "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring",
    "Spring Boot", "Rails", "Laravel", ".NET", "ASP.NET",
    "NestJS", "Gin", "Fiber",
    # Mobile
    "React Native", "Flutter", "SwiftUI", "Jetpack Compose",
    "Xamarin", "Ionic",
    # Databases
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite",
    "Oracle", "Cassandra", "DynamoDB", "Firebase", "Supabase",
    "Elasticsearch", "Neo4j",
    # Cloud & DevOps
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
    "Ansible", "Jenkins", "GitHub Actions", "GitLab CI",
    "CI/CD", "Nginx", "Apache", "Heroku", "Vercel", "Netlify",
    "Linux", "Windows Server",
    # Data & ML
    "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn",
    "Keras", "OpenCV", "Hugging Face", "Spark", "Hadoop",
    "Machine Learning", "Deep Learning", "NLP",
    "Natural Language Processing", "Computer Vision",
    "Data Analysis", "Data Science", "Data Engineering",
    "Power BI", "Tableau", "Excel", "Matplotlib", "Seaborn",
    # APIs & Architecture
    "REST API", "GraphQL", "gRPC", "Microservices", "Serverless",
    "WebSockets", "OAuth", "JWT",
    # Tools & Platforms
    "Git", "GitHub", "GitLab", "Bitbucket", "JIRA", "Confluence",
    "Trello", "Slack", "Postman", "Swagger", "Figma",
    "VS Code", "IntelliJ",
    # Methodologies
    "Agile", "Scrum", "Kanban", "DevOps", "TDD", "BDD",
    "OOP", "Functional Programming",
    # Design & Marketing
    "UI/UX", "Photoshop", "Illustrator", "After Effects",
    "SEO", "Digital Marketing", "Content Writing",
    "Google Analytics", "Social Media Marketing",
    # Soft skills
    "Communication", "Leadership", "Problem Solving", "Teamwork",
    "Project Management", "Time Management", "Critical Thinking",
    "Adaptability", "Creativity", "Mentoring",
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Open a PDF from raw bytes (in-memory) and return all extracted text.

    Each page's text is separated by a newline.  Returns an empty string
    if the PDF contains no extractable text (e.g. scanned images).
    """
    text_parts: list[str] = []
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as exc:
        raise ValueError(f"Could not read PDF file: {exc}") from exc

    return "\n".join(text_parts)


def extract_email(text: str) -> str | None:
    """Return the first email address found in *text*, or ``None``."""
    match = re.search(
        r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
        text,
    )
    return match.group(0) if match else None


def extract_name(text: str) -> str:
    """
    Heuristic: treat the first non-empty, non-whitespace line as the
    candidate's name.  Falls back to ``"Unknown"`` if the text is blank.
    """
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            # Remove common leading labels
            for prefix in ("name:", "name :", "full name:", "full name :"):
                if stripped.lower().startswith(prefix):
                    stripped = stripped[len(prefix):].strip()
                    break
            return stripped if stripped else "Unknown"
    return "Unknown"


def extract_skills(text: str) -> list[str]:
    """
    Compare *text* against ``SKILLS_DATABASE`` (case-insensitive) and
    return a deduplicated, sorted list of matched skill names.

    We use word-boundary regex (``\\b``) to avoid partial matches
    (e.g. "C" should not match inside "Communication").
    """
    text_lower = text.lower()
    found: set[str] = set()

    for skill in SKILLS_DATABASE:
        # Build a pattern with word boundaries; escape regex-special chars
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found.add(skill)

    return sorted(found, key=str.lower)


def parse_resume(file_bytes: bytes) -> dict[str, Any]:
    """
    High-level convenience function: extract text from a PDF and return
    structured resume data.

    Returns
    -------
    dict
        ``{candidate_name, email, resume_text, skills}``
    """
    resume_text = extract_text_from_pdf(file_bytes)

    if not resume_text.strip():
        raise ValueError(
            "Could not extract any text from the PDF. "
            "The file may be scanned or image-based."
        )

    candidate_name = extract_name(resume_text)
    email = extract_email(resume_text)
    skills = extract_skills(resume_text)

    return {
        "candidate_name": candidate_name,
        "email": email,
        "resume_text": resume_text,
        "skills": skills,
    }
