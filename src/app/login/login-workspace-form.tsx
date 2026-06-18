"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { login } from "@/app/login/actions";

type LoginStep = "credentials" | "verification";

type LoginValues = {
  email: string;
  password: string;
};

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

const initialValues: LoginValues = {
  email: "",
  password: "",
};

function HiddenLoginFields({ step, values }: { step: LoginStep; values: LoginValues }) {
  if (step === "credentials") {
    return null;
  }

  return (
    <>
      <input name="email" type="hidden" value={values.email} />
      <input name="password" type="hidden" value={values.password} />
    </>
  );
}

function VerificationSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98] disabled:cursor-wait disabled:bg-slate-500"
      disabled={pending}
      type="submit"
    >
      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      {pending ? "Sending code..." : "Confirm and enter"}
    </button>
  );
}

export function LoginWorkspaceForm({
  error,
  next,
  reset,
}: {
  error?: string;
  next: string;
  reset?: string;
}) {
  const [step, setStep] = useState<LoginStep>("credentials");
  const [values, setValues] = useState<LoginValues>(initialValues);
  const formRef = useRef<HTMLFormElement>(null);

  function updateValue(key: keyof LoginValues, value: string) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function goToVerification() {
    if (!formRef.current?.reportValidity()) {
      return;
    }

    setStep("verification");
  }

  const recoveryHref = values.email
    ? `/forgot-password?email=${encodeURIComponent(values.email)}`
    : "/forgot-password";

  return (
    <div className="w-full max-w-[430px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
          {step === "credentials" ? (
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">
            {step === "credentials" ? "Sign in details" : "Email verification"}
          </p>
          <p className="text-xs text-slate-500">
            {step === "credentials"
              ? "Aptelys by Interellis workspace"
              : "Aptelys sends a code to your work email."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2" aria-label="Login progress">
        {["credentials", "verification"].map((item) => (
          <div
            className={`h-1.5 rounded-full transition ${
              item === "credentials" || step === "verification" ? "bg-slate-950" : "bg-slate-200"
            }`}
            key={item}
          />
        ))}
      </div>

      {error === "invalid" ? (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          Email, password, or workspace access is invalid.
        </div>
      ) : null}

      {error === "verification" ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          Verification expired. Sign in again to continue.
        </div>
      ) : null}

      {reset === "success" ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
          Password updated. Sign in with your new password.
        </div>
      ) : null}

      {step === "verification" ? (
        <button
          className="mt-5 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-500 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950"
          onClick={() => setStep("credentials")}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to login details
        </button>
      ) : null}

      <form action={login} className="mt-5 grid gap-3" ref={formRef}>
        <input name="next" type="hidden" value={next} />
        <HiddenLoginFields step={step} values={values} />

        {step === "credentials" ? (
          <>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
              <input
                autoComplete="email"
                className={inputClass}
                name="email"
                onChange={(event) => updateValue("email", event.target.value)}
                placeholder="you@company.com"
                required
                type="email"
                value={values.email}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-500">Password</span>
              <input
                autoComplete="current-password"
                className={inputClass}
                name="password"
                onChange={(event) => updateValue("password", event.target.value)}
                placeholder="Your password"
                required
                type="password"
                value={values.password}
              />
            </label>
            <div className="flex justify-end">
              <Link className="text-sm font-semibold text-slate-500 transition hover:text-slate-950" href={recoveryHref}>
                Forgot password?
              </Link>
            </div>
            <button
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
              onClick={goToVerification}
              type="button"
            >
              Continue to verification
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        ) : null}

        {step === "verification" ? (
          <>
            <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-950">Email code</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  Aptelys will send a 6-digit code to your work email.
                </span>
              </span>
            </div>
            <VerificationSubmitButton />
          </>
        ) : null}
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        New company?{" "}
        <Link className="font-semibold text-slate-950 hover:text-slate-600" href="/signup">
          Create workspace
        </Link>
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm font-semibold text-slate-500">
        <Link className="hover:text-slate-950" href="/">
          Aptelys home
        </Link>
        <span aria-hidden="true">/</span>
        <Link className="hover:text-slate-950" href="/candidate-status">
          Candidate status
        </Link>
      </div>
    </div>
  );
}
