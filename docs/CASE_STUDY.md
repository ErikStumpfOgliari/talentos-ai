# TalentOS AI Case Study

## One-Line Summary

TalentOS AI is an AI-powered Recruitment CRM and ATS SaaS that helps hiring teams collect applications, parse resumes, rank candidates, manage pipelines, schedule interviews, automate email communication, and monitor hiring performance.

## Problem

Recruiting teams often work across disconnected tools: job boards, spreadsheets, inboxes, calendar links, resume folders, and analytics reports. This creates slow screening cycles, inconsistent candidate communication, poor visibility into hiring bottlenecks, and manual work for recruiters.

The product challenge was to design a focused MVP that feels like a real SaaS product, not a static dashboard. The system needed to support realistic recruiter workflows while also demonstrating modern full-stack architecture and AI integration.

## Product Goals

- Give recruiters a central workspace for jobs, candidates, applications, interviews, email automation, and analytics.
- Parse resumes into structured candidate profiles.
- Rank candidates against jobs with explainable match scores.
- Persist pipeline movement and trigger workflow side effects.
- Let candidates apply through a public careers page and check application status.
- Let candidates self-schedule interviews from available time slots.
- Surface integration readiness for OpenAI, email delivery, Google Calendar, and resume storage.

## Scope Delivered

- Multi-tenant organization model with users, memberships, roles, and permissions.
- Real authentication and protected internal routes.
- Job management with public careers visibility.
- Candidate CRM with resumes, notes, emails, interviews, applications, skills, education, and experience.
- Resume upload, parsing, review, and profile update workflows.
- AI resume parser using OpenAI when configured, with local fallback for demo reliability.
- Candidate-to-job matching with score explanations and embeddings support.
- Drag-and-drop ATS pipeline persisted in PostgreSQL.
- Audit trail for important workflow actions.
- Email templates, automation rules, local outbox, Resend support, and webhook delivery updates.
- Google Calendar OAuth integration for interview creation, updates, cancellations, and sync state.
- Self-scheduling links for candidates.
- Public careers pages, public application form, application confirmation, and public status page.
- Hiring analytics dashboard with funnel, conversion, time in pipeline, and job performance.
- Admin readiness dashboard with integration and reliability checks.
- Local smoke test covering critical authenticated and public routes.

## Architecture

The app is built with Next.js, React, TypeScript, Tailwind CSS, Prisma, and PostgreSQL. The backend uses server components, server actions, API routes, and middleware/proxy for route protection.

The database model is centered on:

- Organizations
- Users and memberships
- Jobs
- Candidates
- Applications
- Pipeline stages
- Resume documents
- Interviews
- Scheduling links
- Email templates and messages
- Automation rules
- Embeddings
- Audit events

The product is designed so provider integrations are optional during development. If no OpenAI or Resend key is configured, the demo still works through local fallback parsing, local matching, and local outbox mode.

## AI Implementation

TalentOS AI uses AI in two places:

1. Resume parsing
   - Extracts structured fields such as name, email, skills, experience, education, summary, availability, and salary expectation.
   - Uses OpenAI structured JSON extraction when `OPENAI_API_KEY` is configured.
   - Falls back to local parsing for demo resilience.

2. Candidate matching
   - Scores candidates against job descriptions and requirements.
   - Supports OpenAI embeddings when configured.
   - Stores explanations with strengths, gaps, matched skills, missing skills, and signal scores.
   - Lets recruiters inspect why a candidate was ranked highly or flagged for review.

## Integration Design

Email automation:

- Templates are tied to triggers such as application received, stage changed, interview scheduled, offer follow-up, and rejection.
- Messages can be queued locally or sent through Resend.
- Resend webhook updates can mark messages as delivered, bounced, or failed.

Calendar integration:

- Google Calendar OAuth stores per-user calendar connections.
- Interviews can create, update, or cancel calendar events.
- Sync states are visible to recruiters and admins.
- Self-scheduling links create interviews from candidate-selected slots.

Resume storage:

- Local storage is used in development.
- S3-compatible storage can be configured for production.
- Admin readiness shows whether storage is local or production-ready.

## Demo Story

The seeded demo workspace, Northstar Recruiting, represents a recruiting team filling multiple roles:

- Senior Full Stack Engineer
- AI Product Engineer
- Recruiting Operations Manager
- Backend Platform Engineer

The demo includes candidates across the full funnel: applied, screening, interview, offer, hired, and rejected. It also includes realistic operational issues such as queued emails, failed email delivery, failed calendar sync, and resumes that need manual review.

This makes screenshots and walkthroughs feel like a live product with real workflow state.

## Engineering Highlights

- Prisma 7 with PostgreSQL and a multi-tenant relational schema.
- Role-based access control across recruiting, analytics, automation, and admin surfaces.
- Server-side data loaders for product pages.
- Server actions for mutations such as candidate updates, pipeline movement, email queueing, and interview scheduling.
- Provider fallbacks that keep the app demoable without paid services.
- Audit trail for workflow accountability.
- Smoke tests that validate critical routes against real seeded data.

## Product Outcomes

The MVP demonstrates how an ATS can reduce recruiter manual work by:

- Turning resumes into structured profiles.
- Ranking candidates against roles.
- Keeping all candidate context in one detail page.
- Reducing scheduling friction through self-scheduling.
- Automating routine emails.
- Giving managers visibility into funnel conversion and pipeline bottlenecks.
- Making integration readiness visible before deployment.

## What I Would Improve Next

- Add Playwright E2E tests for the highest-value flows.
- Add background jobs for parsing, email delivery, and calendar retries.
- Add tenant onboarding and billing.
- Add advanced analytics exports.
- Add hiring team scorecards and structured interview feedback.
- Add production observability for provider failures and queue latency.

## Portfolio Positioning

This project can be positioned as a full-stack AI SaaS build covering product design, AI workflows, data modeling, authentication, integrations, operational reliability, and polished demo storytelling.
