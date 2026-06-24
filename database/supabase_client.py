"""
database/supabase_client.py — Initialise the Supabase client.

The client is created once at module-import time and re-used across
the application.  If credentials are missing (e.g. during local dev
without a .env file), a warning is printed and `supabase` is set to
None so the rest of the app can still start.
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

supabase: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[OK]  Supabase client initialised successfully.")
    except Exception as exc:
        print(f"[WARN]  Failed to initialise Supabase client: {exc}")
        supabase = None
else:
    print(
        "[WARN]  SUPABASE_URL or SUPABASE_KEY not set. "
        "Database operations will be unavailable. "
        "Create a .env file with your Supabase credentials."
    )
