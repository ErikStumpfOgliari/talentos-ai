# TalentOS AI - Recruitment CRM / ATS SaaS

AI-powered recruitment CRM and applicant tracking system built as a full-stack SaaS portfolio project.

The product is designed for recruiting teams that need to parse resumes, rank candidates against job descriptions, manage ATS pipelines, schedule interviews, automate candidate communication, and monitor hiring performance.

## Current Status

Milestone 1 is complete and Milestone 2 has started: the Next.js foundation is created, the first product screen is implemented, and Prisma/PostgreSQL multi-tenant data modeling is in place.

Implemented in the current build:

- SaaS application shell with organization context
- Hiring dashboard with operational metrics
- ATS pipeline with drag-and-drop candidate movement
- Candidate detail panel with AI match score, extracted skills, strengths, and review notes
- Open jobs table
- Interview schedule panel
- Email automation panel
- AI match ranking list
- Resume parser queue and hiring analytics preview
- Prisma 7 configuration for PostgreSQL
- Multi-tenant database schema centered on organizations, memberships, roles, jobs, candidates, applications, pipeline stages, resumes, interviews, email workflows, embeddings, and audit events
- PostgreSQL Docker setup with pgvector enabled
- Seed script for realistic portfolio/demo data
- Server-side dashboard data loader with fallback demo data when the database is unavailable
- Candidate CRM with PostgreSQL-backed candidate creation, skills, education, resume snapshots, and job applications
- AI resume parser flow using OpenAI Responses API with structured JSON extraction when `OPENAI_API_KEY` is configured
- PDF and text resume upload form with offline local text fallback for development

## Planned Product Scope

- Authentication, password reset, organizations, users, roles, and permissions
- Job management with hiring team ownership
- Candidate CRM with resume uploads and candidate history
- AI resume parsing with structured extraction
- Candidate-to-job matching using embeddings and explainable scores
- ATS pipeline with drag-and-drop workflow per job
- Email templates, variables, delivery logs, and stage-based automation
- Interview scheduling with Google Calendar integration
- Analytics dashboards for funnel conversion, time to hire, recruiter performance, and source quality
- Admin settings, audit activity, and production-ready seed data

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- UI interactions: dnd-kit, lucide-react
- Backend foundation: Next.js server components/actions/API routes
- Database: PostgreSQL with Prisma
- Planned AI: OpenAI APIs, embeddings, pgvector
- Planned integrations: Resend or SendGrid, Google Calendar, object storage for resumes

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Validate the project:

```bash
npm run lint
npm run build
```

## Database Setup

Start Docker Desktop, then run PostgreSQL:

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

Open Prisma Studio:

```bash
npm run db:studio
```

The local database URL is defined in `.env` and mirrored in `.env.example`:

```text
postgresql://talentos:talentos@localhost:5432/talentos?schema=public
```

For AI resume parsing, add an OpenAI API key:

```text
OPENAI_API_KEY="sk-..."
OPENAI_RESUME_PARSER_MODEL="gpt-5.4-mini"
```

The dashboard uses PostgreSQL when the database is reachable. If the database is offline, it falls back to the demo data so the UI remains usable during development.

## Portfolio Positioning

Suggested description:

> Built an AI-powered Recruitment CRM / ATS SaaS platform with multi-tenant product architecture, resume parsing, embeddings-based candidate matching, drag-and-drop ATS workflows, interview scheduling, email automation, analytics dashboards, and admin management.

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
11. Analytics dashboards and exports
12. Production polish, tests, seed data, deployment, screenshots, and case study
