-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('pending', 'accepted', 'edited', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "company_name" TEXT,
    "role_title" TEXT,
    "raw_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jd_requirements" (
    "id" UUID NOT NULL,
    "job_description_id" UUID NOT NULL,
    "skills" JSONB NOT NULL,
    "tools" JSONB NOT NULL,
    "domain_terms" JSONB NOT NULL,
    "seniority_signals" JSONB NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jd_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tailoring_runs" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "resume_id" UUID NOT NULL,
    "job_description_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tailoring_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_bullets" (
    "id" UUID NOT NULL,
    "resume_id" UUID NOT NULL,
    "section" TEXT,
    "text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_bullets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bullet_evaluations" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "bullet_id" UUID NOT NULL,
    "features" JSONB NOT NULL,
    "match_score" INTEGER NOT NULL,
    "matched_terms" JSONB NOT NULL,
    "missing_terms" JSONB NOT NULL,
    "overlap_gap" BOOLEAN NOT NULL,
    "evidence_gap" BOOLEAN NOT NULL,
    "question" TEXT,
    "scoring_version" TEXT NOT NULL,
    "inputs_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bullet_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bullet_stories" (
    "id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "raw_input" TEXT NOT NULL,
    "story_facts" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bullet_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bullet_revisions" (
    "id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "revision_text" TEXT NOT NULL,
    "claims_used" JSONB NOT NULL,
    "decision" "Decision" NOT NULL DEFAULT 'pending',
    "decided_text" TEXT,
    "decided_at" TIMESTAMP(3),
    "model_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bullet_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "jd_requirements_job_description_id_key" ON "jd_requirements"("job_description_id");

-- CreateIndex
CREATE UNIQUE INDEX "bullet_evaluations_run_id_bullet_id_key" ON "bullet_evaluations"("run_id", "bullet_id");

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jd_requirements" ADD CONSTRAINT "jd_requirements_job_description_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_runs" ADD CONSTRAINT "tailoring_runs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_runs" ADD CONSTRAINT "tailoring_runs_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_runs" ADD CONSTRAINT "tailoring_runs_job_description_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_bullets" ADD CONSTRAINT "resume_bullets_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bullet_evaluations" ADD CONSTRAINT "bullet_evaluations_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "tailoring_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bullet_evaluations" ADD CONSTRAINT "bullet_evaluations_bullet_id_fkey" FOREIGN KEY ("bullet_id") REFERENCES "resume_bullets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bullet_stories" ADD CONSTRAINT "bullet_stories_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "bullet_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bullet_revisions" ADD CONSTRAINT "bullet_revisions_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "bullet_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
