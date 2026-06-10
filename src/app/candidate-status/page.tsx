import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, KeyRound, Sparkles } from "lucide-react";

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
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 lg:px-6">
        <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-lg bg-slate-950 p-8 text-white">
            <Link className="inline-flex items-center gap-3" href="/">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-950">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold">TalentOS AI</p>
                <p className="text-xs text-slate-300">Candidate application status</p>
              </div>
            </Link>

            <div className="mt-20 max-w-xl">
              <p className="text-sm font-semibold uppercase text-emerald-300">Candidate portal</p>
              <h1 className="mt-4 text-5xl font-semibold leading-tight">Access your application timeline.</h1>
              <p className="mt-5 text-base leading-7 text-slate-300">
                Candidates do not need an internal account. Use the secure status link or token sent after applying.
              </p>
            </div>
          </div>

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
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  name="token"
                  placeholder="Paste token or status URL"
                  required
                />
              </label>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white" type="submit">
                Open application
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-950">Looking for open roles?</p>
              <Link className="mt-2 inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-950" href="/careers">
                <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                View available jobs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
