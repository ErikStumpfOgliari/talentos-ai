# Aptelys Security Operations Checklist

Use this checklist after code-level hardening is deployed.

## Supabase

- Keep `DATABASE_URL` and `DIRECT_URL` server-only. Never expose them as `NEXT_PUBLIC_*`.
- Use a pooled connection for the deployed app and a direct connection only for migrations/admin jobs.
- Enable point-in-time recovery or scheduled backups for production data.
- Rotate the database password after sharing access, changing vendors, or exposing local `.env` files.
- Keep public API keys out of the app unless Supabase client-side access is intentionally introduced.
- If client-side Supabase is introduced later, enable Row Level Security before shipping any browser database calls.

## Vercel

- Mark secrets as sensitive environment variables.
- Scope production secrets only to Production when possible.
- Rotate `AUTH_SECRET`, `RESEND_API_KEY`, OpenAI keys, and storage keys if they were pasted in chat or screenshots.
- Keep `NEXT_PUBLIC_APP_URL` set to the canonical production domain.
- Review deployment logs for `security.rate_limited`, webhook verification errors, and failed email deliveries.

## Resume Storage

- Prefer S3-compatible private storage for production resumes.
- Use signed upload URLs for large files and keep buckets private.
- Do not expose raw bucket URLs unless the object is intentionally public.
- Follow `docs/resume-storage-setup.md` and run `npm run storage:check` after configuring storage variables.
- Add malware scanning before enterprise/customer production use.

## DNS And Email

- Keep SPF, DKIM, and DMARC active for the sending domain.
- Start with DMARC `p=none`, then move to `quarantine` or `reject` after delivery is stable.
- Watch Resend bounce/failed webhook events after launch.

## Monitoring Signals

- `security.rate_limited`: abusive traffic or broken automation.
- `auth.login_failed`: repeated login failures.
- `password_recovery.requested`: recovery spikes.
- `public_application.submitted`: application volume spikes.
- `resend.email.failed` or `resend.email.bounced`: email delivery issues.
