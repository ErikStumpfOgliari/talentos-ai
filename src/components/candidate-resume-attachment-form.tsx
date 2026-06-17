"use client";

import { useState } from "react";
import {
  CheckCircle2,
  FileSearch,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";

type CandidateResumeAttachmentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  candidateId: string;
};

const textareaClass =
  "min-h-28 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function hasResumePayload(form: HTMLFormElement) {
  const formData = new FormData(form);
  const resumeFile = formData.get("resumeFile");
  const resumeText = formData.get("resumeText");
  const hasFile = resumeFile instanceof File && resumeFile.size > 0;
  const hasText = typeof resumeText === "string" && resumeText.trim().length > 0;

  return hasFile || hasText;
}

export function CandidateResumeAttachmentForm({
  action,
  candidateId,
}: CandidateResumeAttachmentFormProps) {
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFileSize, setSelectedFileSize] = useState("");
  const fileInputId = `candidate-resume-file-${candidateId}`;

  return (
    <>
      <form
        action={action}
        className="grid gap-3"
        onSubmit={(event) => {
          if (hasResumePayload(event.currentTarget)) {
            setIsReviewing(true);
          }
        }}
      >
        <input name="candidateId" type="hidden" value={candidateId} />

        <label className="grid min-w-0 gap-1.5">
          <span className="text-xs font-semibold uppercase text-slate-500">Resume file</span>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            <input
              accept=".pdf,.txt,.md,text/plain,application/pdf"
              className="sr-only"
              id={fileInputId}
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
              htmlFor={fileInputId}
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Choose file
            </label>
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
        </label>

        <label className="grid min-w-0 gap-1.5">
          <span className="text-xs font-semibold uppercase text-slate-500">Optional text for scanned PDF</span>
          <textarea
            className={textareaClass}
            name="resumeText"
            placeholder="Paste the resume text only if the PDF is scanned, image-only, or the local reader cannot extract text."
          />
        </label>

        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
          disabled={isReviewing}
          type="submit"
        >
          {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSearch className="h-4 w-4" aria-hidden="true" />}
          {isReviewing ? "Reviewing resume" : "Attach for review"}
        </button>
      </form>

      {isReviewing ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-950">Resume review in progress</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Aptelys is reading the attachment and preparing extracted data for recruiter review.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {["File received", "Local text review", "Candidate profile signals"].map((step) => (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2" key={step}>
                  <Sparkles className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
