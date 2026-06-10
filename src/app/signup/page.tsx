import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, Building2, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { createWorkspaceSignup } from "@/app/signup/actions";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function getErrorMessage(error?: string) {
  if (error === "email") {
    return "This email already has an account. Sign in or use an invitation link.";
  }

  if (error === "password") {
    return "Password must have at least 8 characters.";
  }

  if (error === "missing") {
    return "Fill every required field to create your workspace.";
  }

  return null;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorMessage = getErrorMessage(params?.error);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-6">
        <div className="relative overflow-hidden rounded-lg bg-slate-950 p-6 text-white lg:p-10">
          <div className="absolute inset-0 opacity-70">
            <div className="grid h-full grid-cols-3 gap-3 p-6">
              {["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"].map((stage, index) => (
                <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3" key={stage}>
                  <p className="text-xs font-semibold text-slate-300">{stage}</p>
                  <div className="mt-4 space-y-2">
                    <div className="h-16 rounded-lg bg-white/[0.12]" />
                    {index % 2 === 0 ? <div className="h-12 rounded-lg bg-white/[0.08]" /> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex h-full min-h-[560px] flex-col justify-between">
            <Link className="inline-flex items-center gap-3" href="/">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-950">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-base font-semibold">TalentOS AI</p>
                <p className="text-sm text-slate-300">Recruitment CRM</p>
              </div>
            </Link>

            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase text-emerald-300">Owner + recruiter setup</p>
              <h1 className="mt-4 text-5xl font-semibold leading-tight">Create a hiring workspace that is ready to operate.</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                The first user becomes the workspace owner and can immediately create jobs, parse resumes, rank candidates, and invite recruiters.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Building2, label: "Workspace" },
                  { icon: BriefcaseBusiness, label: "Jobs" },
                  { icon: ShieldCheck, label: "Owner access" },
                ].map((item) => (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4" key={item.label}>
                    <item.icon className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="flex items-center justify-center">
          <div className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Create workspace</p>
                <p className="text-xs text-slate-500">For companies, agencies, and independent recruiters.</p>
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                {errorMessage}
              </div>
            ) : null}

            <form action={createWorkspaceSignup} className="mt-5 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Your name</span>
                <input autoComplete="name" className={inputClass} name="name" placeholder="Erik Santos" required />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Work email</span>
                <input autoComplete="email" className={inputClass} name="email" placeholder="you@company.com" required type="email" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Password</span>
                <input autoComplete="new-password" className={inputClass} minLength={8} name="password" required type="password" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Company or recruiter brand</span>
                <input className={inputClass} name="organizationName" placeholder="TalentOS Recruiting" required />
              </label>
              <button
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
                type="submit"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Create and enter workspace
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Already have a workspace?{" "}
              <Link className="font-semibold text-slate-950 hover:text-slate-600" href="/login">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
