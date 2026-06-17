"use client";

import { useState } from "react";
import {
  CheckCircle2,
  FileSearch,
  FileText,
  Loader2,
  Save,
  Sparkles,
  UploadCloud,
} from "lucide-react";

type JobOption = {
  id: string;
  title: string;
};

type ResumeParserFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  jobs: JobOption[];
};

const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";
const textareaClass =
  "min-h-24 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

const reviewSteps = [
  { icon: FileText, label: "Confirming the uploaded file" },
  { icon: FileSearch, label: "Reading resume text locally" },
  { icon: Sparkles, label: "Detecting skills, experience, and education" },
  { icon: CheckCircle2, label: "Preparing candidate profile and match signals" },
  { icon: Save, label: "Saving review data to the CRM" },
];

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function hasResumePayload(form: HTMLFormElement) {
  const formData = new FormData(form);
  const resumeFile = formData.get("resumeFile");
  const resumeText = formData.get("resumeText");
  const hasFile = resumeFile instanceof File && resumeFile.size > 0;
  const hasText = typeof resumeText === "string" && resumeText.trim().length > 0;

  return hasFile || hasText;
}

export function ResumeParserForm({ action, jobs }: ResumeParserFormProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFileSize, setSelectedFileSize] = useState("");

  return (
    <>
      <form
        action={action}
        className="grid gap-3"
        onSubmit={(event) => {
          if (hasResumePayload(event.currentTarget)) {
            setIsAnalyzing(true);
          }
        }}
      >
        <Field label="Resume file">
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            <input
              accept=".pdf,.txt,.md,text/plain,application/pdf"
              className="sr-only"
              id="resume-parser-file"
              name="resumeFile"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                setSelectedFileName(file?.name ?? "");
                setSelectedFileSize(file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "");
              }}
              type="file"
            />
            <label
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
              htmlFor="resume-parser-file"
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Choose file
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Upload a PDF or text file. The review runs locally and does not require API credits.
            </p>
            {selectedFileName ? (
              <div className="mt-3 flex min-w-0 animate-[pulse_1.6s_ease-in-out_1] items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-semibold">{selectedFileName}</span>
                {selectedFileSize ? <span className="shrink-0 text-emerald-700">{selectedFileSize}</span> : null}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                No file selected yet.
              </div>
            )}
          </div>
        </Field>

        <Field label="Optional text for scanned PDF">
          <textarea
            className={textareaClass}
            name="resumeText"
            placeholder="Paste the resume text only if the PDF is scanned, image-only, or the local reader cannot extract text."
          />
        </Field>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <p className="font-semibold text-slate-900">Smart local resume review</p>
          <p className="mt-1">Aptelys reads embedded text, detects profile signals, and saves the review without external AI credits.</p>
        </div>

        <div className="grid gap-3">
          <Field label="Source">
            <select className={inputClass} name="source" defaultValue="INBOUND">
              <option value="INBOUND">Inbound</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="REFERRAL">Referral</option>
              <option value="CAREERS_PAGE">Careers page</option>
              <option value="MANUAL">Manual</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Apply to job">
            <select className={inputClass} name="jobId" defaultValue="">
              <option value="">Only add to database</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-80"
          disabled={isAnalyzing}
          type="submit"
        >
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          {isAnalyzing ? "Reviewing resume" : "Review resume"}
        </button>
      </form>

      {isAnalyzing ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-950">Resume review in progress</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Aptelys is reading the file, extracting resume signals, and preparing the candidate record.
                </p>
              </div>
            </div>

            {selectedFileName ? (
              <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                Selected file: <span className="text-slate-950">{selectedFileName}</span>
              </div>
            ) : null}

            <div className="mt-4 grid gap-2">
              {reviewSteps.map((step) => {
                const StepIcon = step.icon;

                return (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2" key={step.label}>
                    <StepIcon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span className="text-sm font-medium text-slate-700">{step.label}</span>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              This usually takes a few seconds. Keep this tab open while the parser works.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
