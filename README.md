# ResumeMatch AI 🤖📄

An AI-powered resume screening system built with **Flask** and **Supabase**. Upload PDF resumes, match them against job descriptions, and get instant ATS compatibility scores and skill-match recommendations.

---

## ✨ Features

- **PDF Resume Parsing** — Extracts text, name, email, and skills from uploaded PDF resumes using `pdfplumber`.
- **Skill Matching Engine** — Compares candidate skills against job requirements and calculates a percentage match score.
- **ATS Scoring** — Evaluates resume quality against common Applicant Tracking System criteria (name, email, skills section, education, experience).
- **Job Management** — Create and manage job postings with required skill sets.
- **Screening History** — View, search, and sort all past screening results.
- **Supabase Backend** — All data persisted in a managed PostgreSQL database via Supabase.
- **Render Deployment** — One-click deploy to Render with `gunicorn`.

---

## 🛠️ Tech Stack

| Layer       | Technology                         |
| ----------- | ---------------------------------- |
| Backend     | Python 3.12, Flask 3.1             |
| Database    | Supabase (PostgreSQL)              |
| PDF Parsing | pdfplumber                         |
| CORS        | flask-cors                         |
| Server      | gunicorn (production), Flask dev   |
| Deployment  | Render                             |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/resumematch-ai.git
cd resumematch-ai
```

### 2. Create a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### 5. Create Supabase tables

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Paste the contents of `database/migrations.sql` and click **Run**.

### 6. Run the development server

```bash
python app.py
```

The app will be available at `http://localhost:5000`.

---

## 🗄️ Supabase Setup Guide

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Once the project is ready, navigate to **Settings → API**.
3. Copy the **Project URL** → paste as `SUPABASE_URL` in `.env`.
4. Copy the **anon / public** key → paste as `SUPABASE_KEY` in `.env`.
5. Go to **SQL Editor**, paste the SQL from `database/migrations.sql`, and run it.

---

## ☁️ Deploying on Render

1. Push your code to a GitHub repository.
2. Go to [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repo.
4. Render will auto-detect `render.yaml`. Confirm the settings:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Add environment variables `SUPABASE_URL` and `SUPABASE_KEY` in the Render dashboard.
6. Click **Deploy**.

---

## 📡 API Documentation

| Method | Endpoint                  | Description                              | Body / Params                                              |
| ------ | ------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| POST   | `/api/jobs`               | Create a new job posting                 | JSON: `{title, description, required_skills}`              |
| GET    | `/api/jobs`               | List all job postings                    | —                                                          |
| POST   | `/api/upload-resume`      | Upload & parse a PDF resume              | Form data: `file` (PDF)                                    |
| POST   | `/api/analyze`            | Analyze a resume against a job           | JSON: `{resume_id, job_id}`                                |
| GET    | `/api/results/<id>`       | Get a single screening result            | —                                                          |
| GET    | `/api/results`            | List all screening results               | Query: `?search=&sort_by=created_at&sort_order=desc`       |

### Response format

All API responses return JSON. Errors follow:

```json
{
  "error": "Human-readable error message"
}
```

---

## 🗃️ Database Schema

### `jobs`

| Column          | Type         | Description                |
| --------------- | ------------ | -------------------------- |
| id              | UUID (PK)    | Auto-generated             |
| title           | TEXT         | Job title                  |
| description     | TEXT         | Job description            |
| required_skills | TEXT         | Comma-separated skill list |
| created_at      | TIMESTAMPTZ  | Auto-set on insert         |

### `resumes`

| Column         | Type         | Description                |
| -------------- | ------------ | -------------------------- |
| id             | UUID (PK)    | Auto-generated             |
| candidate_name | TEXT         | Extracted from PDF         |
| email          | TEXT         | Extracted from PDF         |
| resume_text    | TEXT         | Full extracted text        |
| skills         | TEXT         | Comma-separated skill list |
| uploaded_at    | TIMESTAMPTZ  | Auto-set on insert         |

### `screening_results`

| Column         | Type         | Description                  |
| -------------- | ------------ | ---------------------------- |
| id             | UUID (PK)    | Auto-generated               |
| resume_id      | UUID (FK)    | References `resumes.id`      |
| job_id         | UUID (FK)    | References `jobs.id`         |
| match_score    | FLOAT        | 0–100 skill match percentage |
| ats_score      | FLOAT        | 0–100 ATS quality score      |
| matched_skills | TEXT         | Comma-separated matched      |
| missing_skills | TEXT         | Comma-separated missing      |
| recommendation | TEXT         | e.g. "Highly Recommended"   |
| created_at     | TIMESTAMPTZ  | Auto-set on insert           |

---

## 📁 Project Structure

```
resumematch-ai/
├── app.py                      # Flask application entry point
├── config.py                   # App configuration & env loading
├── requirements.txt            # Python dependencies
├── render.yaml                 # Render deployment config
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── README.md                   # This file
│
├── database/
│   ├── __init__.py
│   ├── migrations.sql          # SQL to create Supabase tables
│   ├── supabase_client.py      # Supabase client initialisation
│   └── db_operations.py        # CRUD operations
│
├── services/
│   ├── __init__.py
│   ├── pdf_parser.py           # PDF text extraction & skill detection
│   ├── skill_matcher.py        # Resume ↔ job skill matching
│   └── ats_scorer.py           # ATS resume quality scorer
│
├── templates/                  # Jinja2 HTML templates
│   ├── index.html
│   ├── analyze.html
│   ├── results.html
│   └── history.html
│
└── static/                     # CSS, JS, images
    └── uploads/                # (dev only) uploaded PDFs
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
