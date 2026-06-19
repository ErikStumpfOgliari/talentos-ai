# Resume Storage Setup

Aptelys supports two resume storage modes:

- Local development storage under `storage/resumes`.
- Private S3-compatible storage for production, used for large resume uploads from public job applications.

Production should use private storage. The app generates short-lived signed upload URLs, the browser uploads the file directly to storage, and the database stores only the private object key plus resume metadata.

## Supabase Storage

Supabase Storage exposes an S3-compatible API that works with presigned URLs. Supabase recommends using the direct storage hostname for large uploads:

```text
https://<project-ref>.storage.supabase.co
```

Create a private bucket, for example:

```text
aptelys-resumes
```

Then open the Supabase Storage S3 settings and generate:

- Access Key ID
- Secret Access Key
- Endpoint
- Region

Keep these values server-side only. Supabase S3 access keys bypass Row Level Security, so they must never be exposed as `NEXT_PUBLIC_*`.

## Environment Variables

Set these variables locally in `.env` and in Vercel for Production:

```text
RESUME_STORAGE_S3_BUCKET="aptelys-resumes"
RESUME_STORAGE_S3_REGION="<region shown by Supabase>"
RESUME_STORAGE_S3_ENDPOINT="https://<project-ref>.storage.supabase.co/storage/v1/s3"
RESUME_STORAGE_S3_ACCESS_KEY_ID="<access-key-id>"
RESUME_STORAGE_S3_SECRET_ACCESS_KEY="<secret-access-key>"
RESUME_STORAGE_S3_FORCE_PATH_STYLE="true"
RESUME_STORAGE_PUBLIC_BASE_URL=""
```

Leave `RESUME_STORAGE_PUBLIC_BASE_URL` empty for private resume storage.

## Vercel

In Vercel, add the variables above under Project Settings -> Environment Variables.

Recommended:

- Mark access keys and secrets as sensitive.
- Scope production credentials to Production.
- Redeploy after changing variables.
- Keep `NEXT_PUBLIC_APP_URL` set to the canonical domain, for example `https://aptelys.com`.

## Browser Uploads And CORS

If the app can create signed upload URLs but the browser still fails to upload, configure Supabase Storage CORS for the production domain.

Allowed origins:

```text
https://aptelys.com
https://www.aptelys.com
```

For local testing, also add:

```text
http://localhost:3000
http://localhost:3001
```

Allowed methods:

```text
PUT, GET, HEAD, OPTIONS
```

Allowed headers:

```text
content-type, x-amz-*
```

## Validation

After setting the variables, run:

```bash
npm run storage:check
```

The check:

- Generates a signed resume upload URL.
- Uploads a tiny diagnostic file through that signed URL.
- Deletes the diagnostic object.
- Prints only safe metadata, never keys or signed URLs.

If this passes locally but public applications fail in the browser, the remaining issue is usually CORS.

## References

- Supabase S3 compatibility: https://supabase.com/docs/guides/storage/s3/compatibility
- Supabase S3 authentication: https://supabase.com/docs/guides/storage/s3/authentication
