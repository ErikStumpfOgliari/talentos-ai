import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, KeyRound } from "lucide-react";
import { PublicPageShell } from "@/components/public-site-shell";

export const dynamic = "force-dynamic";

function normalizeToken(value?: string) {
  return value?.trim().replace(/^.*\/careers\/applications\//, "").replace(/[^a-zA-Z0-9_-]/g, "") ?? "";
}

export default async function CandidateStatusPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = normalizeToken(params?.token);

  if (token) {
    redirect(`/careers/applications/${token}`);
  }

  return (
    <PublicPageShell
      actions={
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          href="/careers"
        >
          <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
          View roles
        </Link>
      }
      description="Candidates do not need an internal Aptelys account. Use the secure link or token sent after applying to follow your hiring timeline."
      eyebrow="Candidate portal"
      title="Access your application timeline."
    >
      <section className="mx-auto grid w-full max-w-3xl gap-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Application access</p>
              <p className="text-xs text-slate-500">Paste your token or full status link.</p>
            </div>
          </div>

          <form className="mt-5 grid gap-3" method="get">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-500">Status token</span>
              <input
                className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                name="token"
                placeholder="Paste token or status URL"
                required
              />
            </label>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]" type="submit">
              Open application
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Looking for open roles?</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Browse published jobs and apply directly through the public candidate experience.
          </p>
          <Link className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]" href="/careers">
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            View available jobs
          </Link>
        </div>
      </section>
    </PublicPageShell>
  );
}
