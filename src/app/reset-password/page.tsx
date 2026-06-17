import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { resetPassword } from "@/app/reset-password/actions";
import { InterellisMark } from "@/components/interellis-mark";
import { PublicSiteHeader } from "@/components/public-site-shell";
import { getCurrentSession } from "@/lib/auth";
import {
  findValidPasswordResetToken,
  PASSWORD_RESET_MAX_AGE_MINUTES,
} from "@/lib/password-reset";

export const dynamic = "force-dynamic";

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

function getSafeToken(value?: string) {
  if (!value || value.length > 200) {
    return "";
  }

  return value;
}

function getErrorMessage(error?: string) {
  if (error === "password") {
    return "Password must have at least 8 characters.";
  }

  if (error === "mismatch") {
    return "Passwords do not match.";
  }

  if (error === "expired") {
    return "This recovery link is expired or has already been used.";
  }

  if (error === "invalid") {
    return "Open the secure link from your recovery email to reset your password.";
  }

  return null;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; token?: string }>;
}) {
  const [session, params] = await Promise.all([getCurrentSession(), searchParams]);

  if (session) {
    redirect("/dashboard");
  }

  const token = getSafeToken(params?.token);
  const resetToken = token ? await findValidPasswordResetToken(token) : null;
  const errorMessage = getErrorMessage(params?.error);
  const canReset = Boolean(resetToken);

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(45,212,191,0.18),transparent_32%),radial-gradient(circle_at_86%_20%,rgba(99,102,241,0.12),transparent_28%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]" />
      <div className="relative">
        <PublicSiteHeader variant="dark" />
        <section className="mx-auto grid min-h-[calc(100svh-80px)] max-w-6xl gap-7 px-4 pb-8 pt-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,460px)] lg:items-center lg:px-6">
          <div className="max-w-xl py-6 lg:py-8">
            <Link className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-emerald-200 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-white/10" href="/">
              <InterellisMark className="h-4 w-4" />
              Aptelys by Interellis
            </Link>
            <p className="mt-8 text-sm font-semibold uppercase text-emerald-300">Password reset</p>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight md:text-4xl">
              Set a new password for your recruiting workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Recovery links are single-use, expire in {PASSWORD_RESET_MAX_AGE_MINUTES} minutes, and revoke old sessions after the password changes.
            </p>
            <div className="mt-7 grid gap-2 text-sm font-semibold text-slate-200 sm:grid-cols-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                One-time secure link
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                Existing sessions revoked
              </span>
            </div>
          </div>

          <section className="flex min-w-0 items-center justify-center py-4">
            <div className="w-full max-w-[460px] rounded-xl border border-white/10 bg-white p-5 text-slate-950 shadow-2xl shadow-slate-950/40 sm:p-6">
              <Link className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-500 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950" href="/login">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to sign in
              </Link>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">Create new password</p>
                  <p className="truncate text-xs text-slate-500">
                    {resetToken ? resetToken.user.email : "Secure recovery required."}
                  </p>
                </div>
              </div>

              {errorMessage ? (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                  {errorMessage}
                </div>
              ) : null}

              {canReset ? (
                <form action={resetPassword} className="mt-5 grid gap-3">
                  <input name="token" type="hidden" value={token} />
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase text-slate-500">New password</span>
                    <input
                      autoComplete="new-password"
                      className={inputClass}
                      minLength={8}
                      name="password"
                      placeholder="At least 8 characters"
                      required
                      type="password"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase text-slate-500">Confirm password</span>
                    <input
                      autoComplete="new-password"
                      className={inputClass}
                      minLength={8}
                      name="confirmPassword"
                      placeholder="Repeat your new password"
                      required
                      type="password"
                    />
                  </label>
                  <button
                    className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
                    type="submit"
                  >
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    Reset password
                  </button>
                </form>
              ) : (
                <div className="mt-5 grid gap-3">
                  <p className="text-sm leading-6 text-slate-600">
                    Request a new recovery email to receive a fresh secure link.
                  </p>
                  <Link
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
                    href="/forgot-password"
                  >
                    Request new recovery link
                  </Link>
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
