import { redirect } from "next/navigation";
import {
  BriefcaseBusiness,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { login } from "@/app/login/actions";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const inputClass =
  "h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function getSafeNext(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const session = await getCurrentSession();

  if (session) {
    redirect("/");
  }

  const params = await searchParams;
  const next = getSafeNext(params?.next);

  return (
    <main className="grid min-h-screen bg-slate-100 text-slate-950 lg:grid-cols-[1fr_480px]">
      <section className="hidden min-h-screen flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-950">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-semibold">TalentOS AI</p>
            <p className="text-sm text-slate-400">Recruitment CRM</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase text-emerald-300">Secure workspace</p>
          <h1 className="mt-4 max-w-lg text-5xl font-semibold leading-tight">
            AI recruiting operations with real access control.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Protect candidates, jobs, automation, analytics, and admin settings behind organization roles.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Users, label: "Users" },
              { icon: BriefcaseBusiness, label: "ATS" },
              { icon: ShieldCheck, label: "Roles" },
            ].map((item) => (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4" key={item.label}>
                <item.icon className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">Northstar Recruiting demo tenant</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Sign in</p>
              <p className="text-xs text-slate-500">TalentOS AI workspace</p>
            </div>
          </div>

          {params?.error === "invalid" ? (
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
              Email, password, or workspace access is invalid.
            </div>
          ) : null}

          <form action={login} className="mt-5 grid gap-3">
            <input name="next" type="hidden" value={next} />
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
              <input
                autoComplete="email"
                className={inputClass}
                defaultValue="erik@example.com"
                name="email"
                required
                type="email"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-500">Password</span>
              <input
                autoComplete="current-password"
                className={inputClass}
                defaultValue="talentos-demo-2026"
                name="password"
                required
                type="password"
              />
            </label>
            <button
              className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="submit"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Enter workspace
            </button>
          </form>

          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-950">Demo owner</p>
            <p className="mt-1 text-slate-600">erik@example.com / talentos-demo-2026</p>
          </div>
        </div>
      </section>
    </main>
  );
}
