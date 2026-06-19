import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  completeLoginVerification,
  completeSignupVerification,
} from "@/app/verify-login/actions";
import { InterellisMark } from "@/components/interellis-mark";
import { getCurrentSession } from "@/lib/auth";
import { getEmailProviderStatus } from "@/lib/email-provider";
import { getPendingAuth } from "@/lib/pending-auth";
import { getPendingSignup } from "@/lib/pending-signup";

export const dynamic = "force-dynamic";

const methods = [
  {
    detail: "Use your work email as the primary identity check.",
    icon: Mail,
    label: "Email code",
    value: "EMAIL_CODE",
  },
];

function getSafeNext(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function getSelectedMethod(value?: string) {
  return methods.find((method) => method.value === value) ?? methods[0];
}

function getErrorMessage(error?: string) {
  if (error === "missing") {
    return "Enter the 6-digit code sent to your email.";
  }

  if (error === "invalid") {
    return "That code is not valid. Check your email and try again.";
  }

  if (error === "expired") {
    return "This verification code expired. Start the sign-in again to receive a new code.";
  }

  if (error === "locked") {
    return "Too many incorrect attempts. Start the sign-in again to receive a new code.";
  }

  if (error === "rate_limited") {
    return "Too many verification attempts from this device. Wait a few minutes and try again.";
  }

  return null;
}

export default async function VerifyLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  const [pendingAuth, pendingSignup, params] = await Promise.all([getPendingAuth(), getPendingSignup(), searchParams]);
  const next = getSafeNext(params?.next ?? pendingAuth?.nextPath);
  const isSignup = Boolean(pendingSignup);
  const backHref = isSignup ? "/signup" : `/login?next=${encodeURIComponent(next)}`;

  if (!pendingAuth && !pendingSignup) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10 text-slate-950">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Verification expired</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Start again with your email and password to continue into Aptelys.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]"
            href="/login"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </section>
      </main>
    );
  }

  const selectedMethod = getSelectedMethod(pendingAuth?.preferredAuthFactor ?? pendingSignup?.preferredAuthFactor);
  const SelectedMethodIcon = selectedMethod?.icon;
  const errorMessage = getErrorMessage(params?.error);
  const emailProvider = getEmailProviderStatus();
  const debugCode = pendingSignup?.verificationDebugCode ?? pendingAuth?.verificationDebugCode;
  const showDebugCode = process.env.NODE_ENV !== "production" && !emailProvider.configured && debugCode;

  return (
    <main className="grid min-h-screen bg-slate-100 text-slate-950 lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="hidden min-h-screen flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white lg:flex">
        <Link className="flex w-fit items-center gap-3" href="/">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-950">
            <InterellisMark className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold">Aptelys</p>
            <p className="text-sm text-slate-400">by Interellis</p>
          </div>
        </Link>

        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase text-emerald-300">Security checkpoint</p>
          <h1 className="mt-4 max-w-lg text-5xl font-semibold leading-tight">
            {isSignup ? "Finish protecting your new workspace." : "Confirm this trusted sign-in."}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Aptelys keeps the browser signed in after verification, so recruiters do not need to authenticate on every page.
          </p>
        </div>

        <p className="text-xs text-slate-500">Use sign out to remove access from this browser.</p>
      </section>

      <section className="flex min-h-screen min-w-0 items-center justify-center overflow-hidden px-4 py-10">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950" href={backHref}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {isSignup ? "Back to signup" : "Back to sign in"}
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {isSignup ? "Verify workspace owner" : "Verify your login"}
              </p>
              <p className="text-xs text-slate-500">
                Enter the code sent to your work email.
              </p>
            </div>
          </div>

          <form action={isSignup ? completeSignupVerification : completeLoginVerification} className="mt-6 grid gap-3">
            <input name="next" type="hidden" value={next} />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <input name="method" type="hidden" value={selectedMethod.value} />
              <p className="text-xs font-semibold uppercase text-slate-500">Selected verification</p>
              <div className="mt-3 flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
                  {SelectedMethodIcon ? <SelectedMethodIcon className="h-4 w-4" aria-hidden="true" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-950">{selectedMethod.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">{selectedMethod.detail}</span>
                </span>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                {errorMessage}
              </div>
            ) : null}

            {showDebugCode ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="font-semibold">Development email code</p>
                <p className="mt-1 text-xs leading-5">
                  Resend is not configured locally, so use this code to test the flow.
                </p>
                <p className="mt-2 font-mono text-lg font-semibold tracking-[0.28em]">{debugCode}</p>
              </div>
            ) : null}

            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-500">Verification code</span>
              <input
                autoComplete="one-time-code"
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-center font-mono text-xl font-semibold tracking-[0.35em] text-slate-950 outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                inputMode="numeric"
                maxLength={6}
                name="code"
                pattern="[0-9]{6}"
                placeholder="000000"
                required
              />
            </label>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
              The code expires in 10 minutes and can be used only once.
            </div>

            <button
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
              type="submit"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Verify and continue
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Protected by Aptelys workspace sessions.
          </p>
        </div>
      </section>
    </main>
  );
}
