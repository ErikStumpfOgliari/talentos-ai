# TalentOS AI Screenshot Plan

## Purpose

Use this checklist to capture consistent screenshots for GitHub, LinkedIn, Upwork, portfolio pages, or a case study.

Recommended browser width: 1440px or wider.

## Before Capturing

Run:

```bash
docker compose up -d postgres
npm run db:push
npm run db:seed
npm run dev
```

Sign in:

```text
erik@example.com / talentos-demo-2026
```

Validate:

```bash
npm run smoke
```

## Screenshots

### 1. Dashboard Command Center

Route: `/`

Capture:

- Top metrics
- Senior Full Stack Engineer pipeline
- Candidate cards with match scores
- Top AI Matches panel

Why it matters:

Shows the product immediately as a complete recruiting operating system.

### 2. Job Management

Route: `/jobs`

Capture:

- Active roles table
- Candidate counts
- Average scores
- Job statuses

Why it matters:

Shows multi-role ATS scope beyond a single dashboard.

### 3. Job-Specific Pipeline

Route: open Senior Full Stack Engineer from `/jobs`.

Capture:

- Pipeline stages across Applied, Screening, Interview, Offer, Hired, and Rejected
- Role stats
- Recent activity

Why it matters:

Shows that the ATS board is scoped by job and persisted in the database.

### 4. Candidate CRM

Route: `/candidates`

Capture:

- Candidate list
- Skill chips
- Resume upload/parser section if visible

Why it matters:

Shows the CRM layer where recruiters manage the talent pool.

### 5. Candidate Detail

Route: open Ana Martins, Bianca Costa, or Diego Herrera from `/candidates`.

Capture:

- Profile header
- Match explanations
- Resume history
- Notes, emails, and interviews

Why it matters:

This is the strongest screenshot for showing depth and product completeness.

### 6. Applications Inbox

Route: `/applications`

Capture:

- Rafael Lima with Needs Review
- Joao Pereira with failed parsing
- Manual review queue
- Application status and scheduling links

Why it matters:

Shows the real post-application workflow and human-in-the-loop parsing review.

### 7. AI Matching

Route: `/matching`

Capture:

- Ranked candidates
- Match score explanations
- Matched and missing skills

Why it matters:

Shows AI functionality in a recruiter-friendly, explainable format.

### 8. Email Automation

Route: `/email-automation`

Capture:

- Templates
- Automation rules
- Message statuses
- Provider status

Why it matters:

Shows integration depth and communication automation.

### 9. Interviews

Route: `/interviews`

Capture:

- Interview list
- Calendar sync status
- Active scheduling links
- Availability controls

Why it matters:

Shows scheduling workflow and Google Calendar readiness.

### 10. Public Careers Page

Route: `/careers`

Capture:

- Open roles
- Role cards
- Organization branding

Why it matters:

Shows the candidate-facing entry point.

### 11. Public Application Form

Route: open AI Product Engineer or Senior Full Stack Engineer from `/careers`.

Capture:

- Job description
- Requirements
- Application form with resume upload/text area

Why it matters:

Shows public intake and resume submission.

### 12. Public Candidate Status

Routes:

```text
/careers/applications/demo-ana-fullstack-status
/careers/applications/demo-bianca-ai-status
/careers/applications/demo-joao-backend-status
```

Capture:

- Current stage
- Status timeline
- Confirmation email status
- Resume status

Why it matters:

Shows a polished post-application candidate experience.

### 13. Self-Scheduling

Routes:

```text
/schedule/demo-rafael-schedule
/schedule/demo-mateus-schedule
```

Capture:

- Available time slots
- Candidate/job context
- Scheduling page

Why it matters:

Shows candidate self-service and interview automation.

### 14. Hiring Analytics

Route: `/analytics`

Capture:

- Funnel by stage
- Interview, offer, and hire rates
- Job performance
- Source metrics
- Resume parser health

Why it matters:

Shows business value and operational visibility.

### 15. Admin Readiness

Route: `/admin`

Capture:

- Workspace readiness
- Integration status
- Permission matrix
- Audit trail

Why it matters:

Shows production mindset, permissions, reliability checks, and integration monitoring.

## Suggested Screenshot Order For Portfolio

1. Dashboard
2. Candidate detail
3. Applications inbox
4. AI matching
5. Public application form
6. Interviews/self-scheduling
7. Analytics
8. Admin readiness

## Suggested Caption

"TalentOS AI is a full-stack AI Recruitment CRM / ATS SaaS built with Next.js, PostgreSQL, Prisma, OpenAI-ready resume parsing and matching, drag-and-drop ATS pipelines, public careers intake, email automation, Google Calendar scheduling, analytics, and admin readiness checks."
