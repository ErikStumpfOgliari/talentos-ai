# TalentOS AI Demo Script

## Goal

Use this script to present TalentOS AI in 5 to 7 minutes as a polished full-stack AI SaaS portfolio project.

## Setup

Run the app locally:

```bash
docker compose up -d postgres
npm run db:push
npm run db:seed
npm run dev
```

Sign in with:

```text
Email: erik@example.com
Password: talentos-demo-2026
```

## 30-Second Pitch

"TalentOS AI is an AI-powered Recruitment CRM and ATS SaaS. It helps recruiters publish jobs, collect applications, parse resumes, rank candidates with explainable AI matching, manage a drag-and-drop hiring pipeline, schedule interviews, automate emails, and track hiring analytics. I built it as a full-stack product with Next.js, PostgreSQL, Prisma, OpenAI-ready AI workflows, Resend email automation, Google Calendar scheduling, and a multi-tenant admin model."

## Walkthrough

### 1. Dashboard

Route: `/`

Show:

- AI Recruitment Command Center
- Open roles, candidates, average match score, and pipeline time
- ATS pipeline for Senior Full Stack Engineer
- Candidate cards with match scores and skills
- Top AI matches
- Interview schedule and email automation preview

Talk track:

"The dashboard gives a recruiting team an operational command center. The pipeline is backed by PostgreSQL, the cards are draggable, and movements can trigger audit events and automation emails."

### 2. Job Pipeline

Route: `/jobs`

Open an active role, preferably Senior Full Stack Engineer.

Show:

- Role metadata
- Job-specific Kanban pipeline
- Candidates across Applied, Screening, Interview, Offer, Hired, and Rejected
- Activity and queued email counts

Talk track:

"Each role has its own ATS pipeline. This avoids the common MVP shortcut of showing only one generic board. The data model supports multiple jobs, stages, candidates, applications, and pipeline positions."

### 3. Candidate Detail

Route: `/candidates`

Open Ana Martins, Bianca Costa, or Diego Herrera.

Show:

- Candidate profile
- Skills, education, experience
- Applications by role
- Match explanation
- Notes
- Emails
- Interviews
- Resume history and parser output

Talk track:

"The candidate detail page acts like the CRM record. Recruiters can see the full candidate history across jobs, inspect AI match explanations, review parsed resumes, and manage follow-up context."

### 4. Applications Inbox

Route: `/applications`

Show:

- Rafael Lima in Needs Review
- Joao Pereira with failed parsing
- Match score filters
- Manual review queue
- Public status links
- Scheduling links

Talk track:

"The applications inbox is where public candidates enter the system. It supports resume review, parsed profile application, automatic match score refresh, and operational exceptions like failed parsing."

### 5. AI Matching

Route: `/matching`

Show:

- Ranked candidates
- Saved match scores
- Strengths and gaps
- Matched and missing skills

Talk track:

"Matching is explainable. The system stores not only a score, but also the reasoning signals recruiters need to trust or challenge the recommendation."

### 6. Email Automation

Route: `/email-automation`

Show:

- Templates
- Automation rules
- Queued, sent, delivered, failed, and bounced messages
- Provider status

Talk track:

"Email automation is provider-aware. In local demo mode it uses an outbox, and in production it can send through Resend and receive webhook delivery updates."

### 7. Interviews and Self-Scheduling

Route: `/interviews`

Show:

- Scheduled interviews
- Calendar sync states
- Failed sync example
- Active scheduling links

Public route:

```text
/schedule/demo-rafael-schedule
```

Talk track:

"The interview module supports manual scheduling, Google Calendar sync, and candidate self-scheduling. The demo also surfaces failed sync state, which is important for real operations."

### 8. Public Careers Experience

Route: `/careers`

Show:

- Open roles
- Public application page
- Public status page

Useful public status routes:

```text
/careers/applications/demo-ana-fullstack-status
/careers/applications/demo-bianca-ai-status
/careers/applications/demo-joao-backend-status
```

Talk track:

"The candidate-facing side is public. Candidates can apply, upload a resume, receive confirmation, track status, and self-schedule interviews."

### 9. Analytics

Route: `/analytics`

Show:

- Funnel by stage
- Interview, offer, and hire rates
- Time in pipeline
- Job performance
- Source metrics
- Resume parser health

Talk track:

"Analytics are backed by the real PostgreSQL data model. The seeded demo includes hired and rejected candidates so conversion and funnel screens look realistic."

### 10. Admin Readiness

Route: `/admin`

Show:

- Users and roles
- Permission matrix
- Workspace readiness
- Integration status
- Audit trail

Talk track:

"The admin page is a production-readiness surface. It shows integration state for OpenAI, email, Google Calendar, and storage, plus operational checks like failed emails and resumes needing review."

## Closing

"This project demonstrates a complete AI SaaS workflow: multi-tenant data modeling, protected app routes, public candidate flows, AI parsing and matching, drag-and-drop ATS state, email and calendar integrations, analytics, admin readiness, and smoke-test reliability. The next production steps would be E2E tests, background jobs, billing, tenant onboarding, and deployment monitoring."
