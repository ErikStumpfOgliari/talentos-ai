"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Clipboard,
  ExternalLink,
  FileSearch,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

type CandidateQuickActionsMenuProps = {
  action: (formData: FormData) => void | Promise<void>;
  candidateEmail: string;
  candidateId: string;
  candidateName: string;
};

function canCopyEmail(email: string) {
  return email.includes("@") && !email.toLowerCase().startsWith("no email");
}

export function CandidateQuickActionsMenu({
  action,
  candidateEmail,
  candidateId,
  candidateName,
}: CandidateQuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const profileHref = `/candidates/${candidateId}`;

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label="Candidate actions"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
          <Link
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            href={profileHref}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open profile
          </Link>
          <Link
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            href={`${profileHref}#resume-history`}
          >
            <FileSearch className="h-4 w-4" aria-hidden="true" />
            Review resume
          </Link>
          {canCopyEmail(candidateEmail) ? (
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={async () => {
                await navigator.clipboard.writeText(candidateEmail);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              }}
              type="button"
            >
              <Clipboard className="h-4 w-4" aria-hidden="true" />
              {copied ? "Email copied" : "Copy email"}
            </button>
          ) : null}
          <div className="my-1 h-px bg-slate-100" />
          <form
            action={action}
            onSubmit={(event) => {
              const isPortuguese = document.documentElement.lang.startsWith("pt");
              const confirmed = window.confirm(
                isPortuguese
                  ? `Excluir ${candidateName}? Isso remove o perfil, curriculos, candidaturas, notas e entrevistas deste workspace.`
                  : `Delete ${candidateName}? This removes the candidate profile, resumes, applications, notes, and interviews from this workspace.`,
              );

              if (!confirmed) {
                event.preventDefault();
                return;
              }

              setIsDeleting(true);
            }}
          >
            <input name="candidateId" type="hidden" value={candidateId} />
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-slate-50 hover:text-rose-800 disabled:cursor-wait disabled:opacity-75"
              disabled={isDeleting}
              type="submit"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
              {isDeleting ? "Deleting candidate" : "Delete candidate"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
