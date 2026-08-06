"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { createWorkspaceSignup } from "@/app/signup/actions";

type SignupStep = "account" | "address" | "verification";

type SignupValues = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  email: string;
  name: string;
  organizationName: string;
  password: string;
  phone: string;
  plan: string;
  postalCode: string;
  region: string;
};

type SignupPlanSummary = {
  label: string;
  plan: string;
  priceLabel: string;
  slug: string;
  subtitle: string;
};

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

const initialValues: SignupValues = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  country: "Brazil",
  email: "",
  name: "",
  organizationName: "",
  password: "",
  phone: "",
  plan: "PRO",
  postalCode: "",
  region: "",
};

const steps: Array<{ id: SignupStep; label: string }> = [
  { id: "account", label: "Account details" },
  { id: "address", label: "Company address" },
  { id: "verification", label: "Security check" },
];

function getStepIndex(step: SignupStep) {
  return steps.findIndex((item) => item.id === step);
}

function HiddenFields({
  currentStep,
  values,
}: {
  currentStep: SignupStep;
  values: SignupValues;
}) {
  return (
    <>
      {currentStep !== "account" ? (
        <>
          <input name="name" type="hidden" value={values.name} />
          <input name="email" type="hidden" value={values.email} />
          <input name="phone" type="hidden" value={values.phone} />
          <input name="password" type="hidden" value={values.password} />
          <input name="organizationName" type="hidden" value={values.organizationName} />
        </>
      ) : null}
      {currentStep !== "address" ? (
        <>
          <input name="addressLine1" type="hidden" value={values.addressLine1} />
          <input name="addressLine2" type="hidden" value={values.addressLine2} />
          <input name="city" type="hidden" value={values.city} />
          <input name="region" type="hidden" value={values.region} />
          <input name="postalCode" type="hidden" value={values.postalCode} />
          <input name="country" type="hidden" value={values.country} />
        </>
      ) : null}
      <input name="preferredAuthFactor" type="hidden" value="EMAIL_CODE" />
      <input name="plan" type="hidden" value={values.plan} />
    </>
  );
}

export function SignupWorkspaceForm({
  errorMessage,
  selectedPlan,
}: {
  errorMessage: string | null;
  selectedPlan?: SignupPlanSummary;
}) {
  const [step, setStep] = useState<SignupStep>("account");
  const [values, setValues] = useState<SignupValues>(() => ({
    ...initialValues,
    plan: selectedPlan?.plan ?? initialValues.plan,
  }));
  const formRef = useRef<HTMLFormElement>(null);
  const stepIndex = getStepIndex(step);

  function updateValue(key: keyof SignupValues, value: string) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function goToNextStep(nextStep: SignupStep) {
    if (!formRef.current?.reportValidity()) {
      return;
    }

    setStep(nextStep);
  }

  return (
    <div className="w-full max-w-[490px] rounded-xl border border-white/10 bg-white p-4 text-slate-950 shadow-2xl shadow-slate-950/40 sm:p-5">
      <div className="mb-5">
        {step === "account" ? (
          <Link className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-500 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950" href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Aptelys home
          </Link>
        ) : (
          <button
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-500 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950"
            onClick={() => setStep(step === "verification" ? "address" : "account")}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {step === "verification" ? "Back to address" : "Back to account"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
          {step === "account" ? (
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          ) : step === "address" ? (
            <MapPin className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{steps[stepIndex].label}</p>
          <p className="text-xs text-slate-500">
            {step === "account"
              ? "Tell Aptelys who owns this workspace."
              : step === "address"
                ? "Where should this workspace be registered?"
                : "Aptelys will verify this owner account by email."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Signup progress">
        {steps.map((item, index) => (
          <div
            className={`h-1.5 rounded-full transition ${
              index <= stepIndex ? "bg-slate-950" : "bg-slate-200"
            }`}
            key={item.id}
          />
        ))}
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      <form action={createWorkspaceSignup} className="mt-4 grid gap-3" ref={formRef}>
        <HiddenFields currentStep={step} values={values} />

        {step === "account" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Your name</span>
                <input
                  autoComplete="name"
                  className={inputClass}
                  name="name"
                  onChange={(event) => updateValue("name", event.target.value)}
                  placeholder="Erik Santos"
                  required
                  value={values.name}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Work email</span>
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
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Phone number</span>
                <input
                  autoComplete="tel"
                  className={inputClass}
                  name="phone"
                  onChange={(event) => updateValue("phone", event.target.value)}
                  placeholder="+55 11 90000-0000"
                  required
                  type="tel"
                  value={values.phone}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Password</span>
                <input
                  autoComplete="new-password"
                  className={inputClass}
                  minLength={8}
                  name="password"
                  onChange={(event) => updateValue("password", event.target.value)}
                  required
                  type="password"
                  value={values.password}
                />
              </label>
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-500">Company or recruiter brand</span>
              <input
                className={inputClass}
                name="organizationName"
                onChange={(event) => updateValue("organizationName", event.target.value)}
                placeholder="Aptelys Recruiting"
                required
                value={values.organizationName}
              />
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-slate-500">Plano selecionado</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {selectedPlan ? `${selectedPlan.label} - ${selectedPlan.priceLabel}` : "Intermediário - R$ 69,90/mês"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">30 dias grátis antes da cobrança recorrente.</p>
                </div>
                <Link className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950" href="/pricing">
                  Trocar
                </Link>
              </div>
            </div>
            <button
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
              onClick={() => goToNextStep("address")}
              type="button"
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        ) : null}

        {step === "address" ? (
          <>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-500">Address line</span>
              <input
                autoComplete="street-address"
                className={inputClass}
                name="addressLine1"
                onChange={(event) => updateValue("addressLine1", event.target.value)}
                placeholder="Avenida Paulista, 1000"
                required
                value={values.addressLine1}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase text-slate-500">Address details</span>
              <input
                className={inputClass}
                name="addressLine2"
                onChange={(event) => updateValue("addressLine2", event.target.value)}
                placeholder="Suite, floor, unit"
                value={values.addressLine2}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">City</span>
                <input
                  autoComplete="address-level2"
                  className={inputClass}
                  name="city"
                  onChange={(event) => updateValue("city", event.target.value)}
                  placeholder="Sao Paulo"
                  required
                  value={values.city}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">State / region</span>
                <input
                  autoComplete="address-level1"
                  className={inputClass}
                  name="region"
                  onChange={(event) => updateValue("region", event.target.value)}
                  placeholder="SP"
                  required
                  value={values.region}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Postal code</span>
                <input
                  autoComplete="postal-code"
                  className={inputClass}
                  name="postalCode"
                  onChange={(event) => updateValue("postalCode", event.target.value)}
                  placeholder="01310-100"
                  required
                  value={values.postalCode}
                />
              </label>
              <label className="grid min-w-0 gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">Country</span>
                <input
                  autoComplete="country-name"
                  className={inputClass}
                  name="country"
                  onChange={(event) => updateValue("country", event.target.value)}
                  placeholder="Brazil"
                  required
                  value={values.country}
                />
              </label>
            </div>
            <button
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
              onClick={() => goToNextStep("verification")}
              type="button"
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        ) : null}

        {step === "verification" ? (
          <>
            <div className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-950">Email code</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  The workspace owner receives a 6-digit security code by email.
                </span>
              </span>
            </div>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              After signup, Aptelys opens a verification step before entering the workspace.
            </p>
            <button
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
              type="submit"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Create and verify workspace
            </button>
          </>
        ) : null}
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have a workspace?{" "}
        <Link className="font-semibold text-slate-950 hover:text-slate-600" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
