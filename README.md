# TalentOS AI - Recruitment CRM / ATS SaaS

TalentOS AI is an AI-powered recruitment CRM and applicant tracking system built as a full-stack SaaS portfolio project.

It gives recruiting teams a single workspace to publish jobs, collect applications, parse resumes with AI, rank candidates against job descriptions, manage ATS pipelines, schedule interviews, automate candidate communication, and monitor hiring performance.

## Portfolio Pitch

> Built an AI-powered Recruitment CRM / ATS SaaS platform with multi-tenant architecture, PostgreSQL/Prisma data modeling, resume parsing, explainable candidate matching, drag-and-drop ATS workflows, public careers intake, interview scheduling, email automation, analytics dashboards, and admin readiness checks.

This project is designed to demonstrate full-stack product execution: product thinking, data modeling, authentication, AI integration, third-party integrations, operational dashboards, and production-oriented reliability checks.

## Current Status

The project is an advanced MVP. The core ATS/CRM workflows are implemented, backed by PostgreSQL/Prisma, protected by real authentication, and validated with lint, production build, and local smoke checks.

Implemented in the current build:

- Multi-tenant SaaS workspace with organization context
- Real login/authentication with users, memberships, roles, and permissions
- Hiring dashboard with operational metrics
- Job management with active job detail pages
- Candidate CRM with PostgreSQL-backed profiles, skills, education, experience, notes, emails, interviews, resumes, and application history
- Resume upload, local/S3-compatible file storage, and reprocessing from the candidate profile
- AI resume parsing with OpenAI Responses API structured JSON extraction when `OPENAI_API_KEY` is configured
- Offline local parsing fallback for development and demo reliability
- Candidate-to-job matching with explainable score details and OpenAI embeddings support
- ATS pipeline with drag-and-drop movement persisted in PostgreSQL
- Audit trail for important workflow actions
- Email templates, automation rules, Resend delivery support, local outbox fallback, and Resend webhook status updates
- Interview scheduling with Google Calendar OAuth, event creation, update, cancellation, and sync status
- Self-scheduling links where candidates choose available interview slots
- Public careers page, public job application page, resume submission, application confirmation, and candidate status page
- Applications inbox with resume review, parsed profile application, and match-score refresh
- Hiring analytics dashboard with funnel, interview/offer rates, time in pipeline, and job performance
- Admin workspace readiness view with integration status for OpenAI, email delivery, calendar sync, and resume storage
- Local smoke test covering critical authenticated and public routes

## Demo Access

After running the seed script, use the demo owner account:

```text
Email: erik@example.com
Password: talentos-demo-2026
```

Main routes for a portfolio walkthrough:

- `/` - Executive recruiting dashboard
- `/jobs` - Job management
- `/jobs/[jobId]` - Job-specific ATS pipeline
- `/candidates` - Candidate CRM
- `/candidates/[candidateId]` - Candidate detail, history, resumes, notes, emails, interviews, and matching explanations
- `/applications` - Public application inbox and resume review
- `/matching` - AI candidate ranking
- `/interviews` - Interview scheduling and calendar integration
- `/email-automation` - Templates, rules, queue, and delivery logs
- `/analytics` - Hiring analytics
- `/admin` - Users, permissions, organization settings, readiness, integrations, and audit trail
- `/careers` - Public careers page

## Product Workflows

Recruiter workflow:

1. Create or publish a job.
2. Receive candidates through the public careers page or add them manually.
3. Upload or attach a resume.
4. Parse the resume with AI or local fallback.
5. Review extracted data and apply selected fields to the candidate profile.
6. Rank candidates against a job and inspect score explanations.
7. Move candidates through the ATS pipeline.
8. Trigger automated emails from stage changes, interviews, and rejections.
9. Schedule interviews manually or send a self-scheduling link.
10. Review analytics and admin readiness before demoing or deploying.

Candidate workflow:

1. Visit the public careers page.
2. Open a role and submit profile details plus a resume.
3. Receive an application confirmation email when automation is configured.
4. Open the public application status page.
5. Choose an interview slot from a self-scheduling link.

Admin workflow:

1. Manage users, roles, and membership status.
2. Configure organization settings.
3. Review readiness checks for parsing, emails, calendar sync, automations, and public intake.
4. Inspect integration status for OpenAI, Resend/local outbox, Google Calendar, and resume storage.
5. Monitor audit events for workflow accountability.

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- UI interactions: dnd-kit, lucide-react
- Backend: Next.js server components, server actions, API routes, middleware/proxy
- Database: PostgreSQL, Prisma 7, pgvector-ready Docker setup
- AI: OpenAI Responses API, embeddings-based matching, local fallback parsing/matching
- Email: Resend with local outbox fallback and webhook delivery updates
- Calendar: Google Calendar OAuth and event sync
- Storage: local development storage and S3-compatible resume storage

## Architecture Notes

- The data model is centered on organizations, memberships, roles, jobs, candidates, applications, pipeline stages, resumes, interviews, scheduling links, email templates, automation rules, embeddings, and audit events.
- Authentication protects the internal app while public routes stay available for careers intake, candidate status, and self-scheduling.
- AI features are optional at runtime: the product remains demoable without external keys by using local parsing and matching fallbacks.
- Provider integrations are surfaced in Admin so the workspace can clearly show what is live, configured, pending, or running in fallback mode.
- Smoke tests use a generated session cookie against seeded PostgreSQL data, which catches broken critical routes faster than manual clicking.

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`, then start PostgreSQL:

```bash
docker-compose up -d postgres
```

Apply the Prisma schema:

```bash
npm run db:push
```

Seed the database:

```bash
npm run db:seed
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

The local database URL is defined in `.env` and mirrored in `.env.example`:

```text
postgresql://talentos:talentos@localhost:5432/talentos_ai?schema=public
```

Minimum local environment:

```text
DATABASE_URL="postgresql://talentos:talentos@localhost:5432/talentos_ai?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Optional AI parsing and matching:

```text
OPENAI_API_KEY="sk-..."
OPENAI_RESUME_PARSER_MODEL="gpt-5.4-mini"
```

Optional email delivery:

```text
RESEND_API_KEY=""
EMAIL_FROM="TalentOS AI <onboarding@resend.dev>"
RESEND_WEBHOOK_SECRET=""
```

Optional Google Calendar OAuth:

```text
GOOGLE_CALENDAR_CLIENT_ID=""
GOOGLE_CALENDAR_CLIENT_SECRET=""
GOOGLE_CALENDAR_REDIRECT_URI="http://localhost:3000/api/integrations/google-calendar/callback"
GOOGLE_CALENDAR_CREATE_MEET="true"
GOOGLE_CALENDAR_SEND_UPDATES="none"
```

Optional S3-compatible resume storage:

```text
RESUME_STORAGE_S3_BUCKET=""
RESUME_STORAGE_S3_REGION="us-east-1"
RESUME_STORAGE_S3_ENDPOINT=""
RESUME_STORAGE_S3_ACCESS_KEY_ID=""
RESUME_STORAGE_S3_SECRET_ACCESS_KEY=""
RESUME_STORAGE_S3_FORCE_PATH_STYLE="false"
RESUME_STORAGE_PUBLIC_BASE_URL=""
```

## Validation

Run static checks and production build:

```bash
npm run lint
npm run build
```

Run the local smoke test against the dev server:

```bash
npm run dev
npm run smoke
```

The smoke test checks:

- Authenticated dashboard
- Jobs
- Candidates
- Applications inbox
- AI matching
- Interviews
- Email automation
- Analytics
- Admin readiness
- Public careers page
- Public job application page when seeded data exists
- Optional public application status and self-scheduling links when matching seed data exists

## Deployment Checklist

Before deploying a portfolio demo:

- Configure a production PostgreSQL database.
- Run Prisma migrations or `db:push` according to the hosting workflow.
- Set a strong `AUTH_SECRET`.
- Set `NEXT_PUBLIC_APP_URL` to the deployed domain.
- Seed demo data or create a clean production demo workspace.
- Add `OPENAI_API_KEY` if live AI parsing/matching should be shown.
- Configure Resend and verify sender domain if live email sending should be shown.
- Configure `RESEND_WEBHOOK_SECRET` and the `/api/webhooks/resend` endpoint.
- Configure Google OAuth client credentials and callback URL.
- Configure S3-compatible resume storage for persistent production uploads.
- Run `npm run lint`, `npm run build`, and a smoke check against the deployed URL with `SMOKE_APP_URL`.
- Confirm `/admin` shows the expected readiness and integration statuses.

Example deployed smoke check:

```bash
SMOKE_APP_URL="https://your-demo-domain.com" npm run smoke
```

## Portfolio Screenshot Checklist

Recommended screenshots for a case study or LinkedIn/GitHub portfolio post:

1. Dashboard with hiring metrics and pipeline snapshot.
2. Job detail page with job-specific Kanban pipeline.
3. Candidate detail page showing parsed resume data, match explanation, notes, emails, interviews, and history.
4. Applications inbox with resume review and parsed profile application.
5. AI matching page with ranked candidates.
6. Email automation page with templates, rules, queue, and delivery status.
7. Interviews page with calendar sync and self-scheduling controls.
8. Public careers page and public application form.
9. Public application status page.
10. Admin readiness and integration status dashboard.

## Case Study Outline

Use this structure when writing the portfolio case study:

1. Problem: recruiting teams lose time screening resumes, coordinating interviews, and tracking candidate communication across disconnected tools.
2. Product goal: build a focused ATS/CRM MVP that automates resume extraction, matching, workflow movement, communication, and analytics.
3. Architecture: Next.js app, PostgreSQL/Prisma data model, multi-tenant organization model, server actions/API routes, provider integrations, and smoke-test reliability.
4. AI implementation: structured resume parsing, fallback parsing, embeddings/matching, score explanations, and manual review workflow.
5. Integrations: Resend, Resend webhooks, Google Calendar OAuth, self-scheduling, and resume storage.
6. Product outcomes: faster candidate review, clearer hiring pipeline, lower scheduling friction, and better visibility for hiring teams.
7. Engineering outcomes: scalable schema, role-based access, audit trail, resilient provider fallbacks, and deploy-ready checks.
8. Next improvements: production E2E tests, billing, tenant onboarding, advanced analytics exports, and background job processing.

Ready-to-use portfolio material:

- `docs/CASE_STUDY.md` - polished project case study
- `docs/DEMO_SCRIPT.md` - 5 to 7 minute walkthrough script
- `docs/SCREENSHOT_PLAN.md` - screenshot checklist for portfolio assets

## E2E Test Roadmap

High-value flows to cover with Playwright or a similar E2E tool:

1. Login as demo owner and access protected routes.
2. Create a job and verify it appears on `/jobs` and `/careers`.
3. Submit a public application with resume text.
4. Review parsed resume data and apply selected fields to the candidate profile.
5. Rank candidates for a job and verify match score persistence.
6. Drag a candidate between pipeline stages and verify audit/email automation side effects.
7. Create an interview and verify calendar sync fallback or success status.
8. Generate a self-scheduling link and book a candidate slot.
9. Queue and deliver an email through local outbox or Resend.
10. Confirm Admin readiness reflects integration and reliability state.

## Delivery Roadmap

1. Product foundation and dashboard prototype
2. Data model, PostgreSQL, and Prisma setup
3. Authentication, organizations, users, and roles
4. Job management module
5. Candidate CRM and resume upload flow
6. AI resume parsing pipeline
7. Candidate matching and ranking engine
8. ATS pipeline persistence and workflow actions
9. Email templates and automation logs
10. Interview scheduling and calendar integration
11. Analytics dashboards and public careers experience
12. Production polish, smoke tests, deploy checklist, screenshots, and case study
