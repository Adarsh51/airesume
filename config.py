"""
config.py — Application configuration for ResumeMatch AI.

Loads environment variables using python-dotenv and exposes
all settings needed by the Flask app, Supabase client, and
file-upload handling.
"""

import os
from dotenv import load_dotenv

# Load .env file if present (development mode)
load_dotenv()

# ---------------------------------------------------------------------------
# Supabase credentials
# ---------------------------------------------------------------------------
SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")

# ---------------------------------------------------------------------------
# File upload settings
# ---------------------------------------------------------------------------
UPLOAD_FOLDER: str = "static/uploads"
MAX_CONTENT_LENGTH: int = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS: set = {"pdf"}

# ---------------------------------------------------------------------------
# Flask settings
# ---------------------------------------------------------------------------
SECRET_KEY: str = os.environ.get("SECRET_KEY", "resumematch-ai-secret-key")
DEBUG: bool = os.environ.get("FLASK_DEBUG", "False").lower() in ("true", "1", "yes")
