"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

type DeleteCandidateFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  candidateId: string;
  candidateName: string;
};

export function DeleteCandidateForm({
  action,
  candidateId,
  candidateName,
}: DeleteCandidateFormProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <form
      action={action}
      className="grid gap-3"
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
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:scale-[1.02] hover:bg-rose-100 active:scale-[0.98] disabled:cursor-wait disabled:opacity-75"
        disabled={isDeleting}
        type="submit"
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
        {isDeleting ? "Deleting candidate" : "Delete candidate"}
      </button>
    </form>
  );
}
