import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
} from "lucide-react";
import { SignupWorkspaceForm } from "@/app/signup/signup-workspace-form";
import { InterellisMark } from "@/components/interellis-mark";
import { PublicSiteHeader } from "@/components/public-site-shell";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

  if (error === "rate_limited") {
    return "Too many workspace creation attempts from this device. Wait a few minutes and try again.";
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
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(45,212,191,0.18),transparent_32%),radial-gradient(circle_at_86%_20%,rgba(99,102,241,0.12),transparent_28%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]" />
      <div className="relative">
        <PublicSiteHeader variant="dark" />
        <section className="mx-auto grid min-h-[calc(100svh-80px)] max-w-6xl gap-7 px-4 pb-7 pt-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,490px)] lg:items-center lg:px-6">
          <div className="max-w-xl py-6 lg:py-8">
            <Link className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-emerald-200 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-white/10" href="/">
              <InterellisMark className="h-4 w-4" />
              Aptelys by Interellis
            </Link>
            <p className="mt-8 text-sm font-semibold uppercase text-emerald-300">Company workspace setup</p>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight md:text-4xl">
              Launch a recruiting workspace without the noise.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Create the company space, verify the owner account, and enter a focused ATS for jobs, candidates, interviews, and automation.
            </p>

            <div className="mt-7 grid gap-2 text-sm font-semibold text-slate-200 sm:grid-cols-3">
              {["Owner + recruiter access", "Persistent login", "Public candidate flow"].map((item) => (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5" key={item}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <section className="flex min-w-0 items-center justify-center py-4">
            <SignupWorkspaceForm errorMessage={errorMessage} />
          </section>
        </section>
      </div>
    </main>
  );
}
