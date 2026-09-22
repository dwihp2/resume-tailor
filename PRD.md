# Product Requirements Document (PRD)
## Jev-Tailor: AI Resume Tailor & Storyteller

---

## 1. Product Overview

* **Product Name:** Jev-Tailor (Working Title)
* **Objective:** Build an AI-driven career application that evaluates a user's resume against a specific job description (JD) using a System One logic model (TypeSafe Jev) for deterministic scoring and schema validation, combined with a System Two generative LLM to rewrite content based on candidate storytelling.
* **Target Audience:** Job seekers looking to quantify their project impact, highlight key technical achievements, and tailor their resumes to match Applicant Tracking Systems (ATS) and hiring manager criteria without manual editing friction.

---

## 2. Technical Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (Next.js App Router), Tailwind CSS, TanStack Table, React Hook Form, Framer Motion |
| **Backend** | Node.js (Express or Next.js API Routes) |
| **Database & ORM** | PostgreSQL, Prisma (or Drizzle) |
| **AI Architecture** | TypeSafe Jev (Logic Layer / System One) + Generative LLM (OpenAI GPT-4o / Claude 3.5 Sonnet / Gemini) |
| **Data Validation** | Zod (shared across API endpoints and Jev schemas) |

---

## 3. Core Functionalities (MVP)

### 3.1 Unstructured Data Ingestion
* **Input:** PDF resume upload + pasted Job Description (JD) plain text.
* **System Process:** Parses PDF into raw text, segments the document into individual bullet points, and stores the structured entities in PostgreSQL.

### 3.2 Logic Audit (TypeSafe Jev Integration)
* **Trigger:** User clicks "Analyze Match".
* **System Process:** Backend evaluates resume bullets in parallel against the target JD using TypeSafe Jev and a strict Zod schema.
* **Output:** Generates a `relevanceScore` (0-100), categorizes bullet alignment, and outputs a `needsMoreContext` boolean flag.

### 3.3 Storytelling & Context Extraction
* **Trigger:** User interacts with flagged low-context or low-relevance bullets on the dashboard.
* **System Process:** UI presents targeted prompts (e.g., "What was the latency reduction or user scale?").
* **Output:** Candidate enters raw text or voice input. Jev extracts structured facts (`impactMetric`, `scale`, `techUsed`) into JSON payloads.

### 3.4 Generative Polishing
* **System Process:** Backend merges original high-scoring bullets with Jev-extracted story facts and sends the combined context to the Generative LLM.
* **Output:** Generates rewritten, high-impact bullet points containing verified candidate metrics.

### 3.5 Before & After Diff Review
* **UI Behavior:** Visual comparison interface highlighting AI adjustments.
* **User Control:** Options to accept, manually edit, or reject rewritten bullets.

---

## 4. Database Schema (PostgreSQL)

```sql
-- Core User & Document Entities
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    raw_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    role_title VARCHAR(255),
    raw_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing Sessions & Granular Bullets
CREATE TABLE audit_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    job_description_id UUID REFERENCES job_descriptions(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE resume_bullets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    section VARCHAR(100),
    original_text TEXT NOT NULL,
    display_order INTEGER NOT NULL
);

-- AI Data Layers (Logic & Generation)
CREATE TABLE bullet_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_session_id UUID REFERENCES audit_sessions(id) ON DELETE CASCADE,
    bullet_id UUID REFERENCES resume_bullets(id) ON DELETE CASCADE,
    relevance_score INTEGER,
    needs_context BOOLEAN,
    targeted_question TEXT,
    jev_raw_output JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE candidate_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bullet_evaluation_id UUID REFERENCES bullet_evaluations(id) ON DELETE CASCADE,
    user_raw_input TEXT NOT NULL,
    jev_extracted_facts JSONB,
    final_llm_bullet TEXT,
    user_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

## 5. Next Steps / V2 Roadmap
* **PDF/DOCX Document Generation:** Export finalized resumes directly into clean, ATS-compliant formatted documents.
* **Voice-Based Storytelling Input:** Web Speech API integration enabling hands-free dictation for project context gathering.
* **Automated Mock Interview Prep:** Leverage extracted JSONB candidate story metrics to dynamically generate targeted behavioral STAR interview questions.
* **Skill Gap Analysis:** Automated aggregate scoring across the entire resume to identify missing technical requirements relative to target job descriptions.
