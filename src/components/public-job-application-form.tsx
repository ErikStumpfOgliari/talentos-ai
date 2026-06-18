"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, FileText, Loader2, Send, UploadCloud, X } from "lucide-react";
import { submitCareersApplication } from "@/app/careers/[jobId]/actions";
import {
  MAX_RESUME_FILE_SIZE_BYTES,
  RESUME_FILE_DEFERRED_MESSAGE,
  RESUME_FILE_TOO_LARGE_MESSAGE,
  SERVER_ACTION_SAFE_RESUME_FILE_SIZE_BYTES,
} from "@/lib/resume-upload-limits";
import { LONG_TEXT_LIMIT_HINT, TEXT_LIMITS } from "@/lib/text-limits";

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";
const textareaClass =
  "min-h-28 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function Field({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

function SubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-500"
      disabled={pending || disabled}
      type="submit"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
      {pending ? "Submitting application..." : "Submit application"}
    </button>
  );
}

export function PublicJobApplicationForm({
  errorMessage,
  jobId,
}: {
  errorMessage: string | null;
  jobId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const hasSelectedFile = fileName.length > 0;
  const shouldDeferFileUpload = fileSizeBytes > SERVER_ACTION_SAFE_RESUME_FILE_SIZE_BYTES && fileSizeBytes <= MAX_RESUME_FILE_SIZE_BYTES;

  function clearSelectedFile() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setFileName("");
    setFileError("");
    setFileSizeBytes(0);
  }

  function handleFileChange(file: File | undefined) {
    if (!file) {
      setFileName("");
      setFileError("");
      setFileSizeBytes(0);
      return;
    }

    setFileName(file.name);
    setFileSizeBytes(file.size);

    if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
      setFileError(RESUME_FILE_TOO_LARGE_MESSAGE);
      return;
    }

    setFileError("");
  }

  function handleSubmit() {
    if (shouldDeferFileUpload && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <form action={submitCareersApplication} className="grid gap-4" data-public-application-form onSubmit={handleSubmit}>
      <input name="jobId" type="hidden" value={jobId} />
      <input name="resumeFileName" type="hidden" value={fileName} />
      <input name="resumeFileSizeBytes" type="hidden" value={fileSizeBytes ? String(fileSizeBytes) : ""} />
      <input name="resumeUploadMode" type="hidden" value={shouldDeferFileUpload ? "deferred_large_file" : "attached"} />

      {errorMessage ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold">Application issue</p>
              <p className="mt-1 leading-5">{errorMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">Candidate details</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Tell the recruiting team who is applying.</p>
          </div>
        </div>

        <Field label="Full name">
          <input className={inputClass} name="name" placeholder="Ana Martins" required />
        </Field>
        <Field label="Email">
          <input className={inputClass} name="email" placeholder="ana@example.com" required type="email" />
        </Field>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <Field label="Phone">
            <input className={inputClass} name="phone" placeholder="+55 11 90000-0000" />
          </Field>
          <Field label="Location">
            <input className={inputClass} name="location" placeholder="Sao Paulo, BR" />
          </Field>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <Field label="Current title">
            <input className={inputClass} name="currentTitle" placeholder="Operations Coordinator" />
          </Field>
          <Field label="Experience">
            <input className={inputClass} min={0} name="yearsExperience" placeholder="5" type="number" />
          </Field>
        </div>
        <Field label="Key skills" hint="Separate skills with commas.">
          <input className={inputClass} name="skills" placeholder="Customer service, scheduling, Excel" />
        </Field>
      </section>

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3" id="resume-upload">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">Resume</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Upload a PDF or text file, or paste readable resume text.
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <input
            accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv"
            className="sr-only"
            id="public-resume-file"
            name="resumeFile"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
            ref={fileInputRef}
            type="file"
          />
          <label
            className="group flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center transition hover:border-slate-400 hover:bg-slate-50"
            htmlFor="public-resume-file"
          >
            <UploadCloud className="h-5 w-5 text-slate-700 transition group-hover:-translate-y-0.5" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-950">
              {hasSelectedFile ? "Change resume file" : "Choose resume file"}
            </span>
            <span className="max-w-full truncate text-xs text-slate-500">
              {hasSelectedFile ? fileName : "No file selected yet."}
            </span>
          </label>

          {hasSelectedFile ? (
            <button
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={clearSelectedFile}
              type="button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Remove file
            </button>
          ) : null}

          {fileError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-800">
              {fileError}
            </p>
          ) : null}

          {shouldDeferFileUpload && !fileError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
              {RESUME_FILE_DEFERRED_MESSAGE}
            </p>
          ) : null}
        </div>

        <Field
          hint="Use this field for scanned PDFs, image-only resumes, or when file upload is not available on your device."
          label="Resume text"
        >
          <textarea
            className={textareaClass}
            maxLength={TEXT_LIMITS.longText}
            name="resumeText"
            placeholder="Paste resume text if you cannot upload a file."
          />
          <span className="text-xs text-slate-500">{LONG_TEXT_LIMIT_HINT}</span>
        </Field>
      </section>

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <Field label="Note to hiring team">
          <textarea
            className={textareaClass}
            maxLength={TEXT_LIMITS.longText}
            name="coverLetter"
            placeholder="Share context, availability, or why this role fits."
          />
          <span className="text-xs text-slate-500">{LONG_TEXT_LIMIT_HINT}</span>
        </Field>
      </section>

      <SubmitButton disabled={Boolean(fileError)} />
    </form>
  );
}
