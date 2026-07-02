"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrainCircuit, CheckCircle2, Loader2 } from "lucide-react";

type AnalysisResult = {
  score: number;
  recommendation: string;
  short_summary: string;
};

export function AiAnalyzeButton({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/applications/${applicationId}/analyze`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Analysis failed. Please try again.");
        return;
      }

      setResult(data.result);
      router.refresh();
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const recommendationLabel: Record<string, string> = {
    avancar: "Advance",
    talvez: "Consider",
    rejeitar: "Reject",
  };

  const recommendationTone: Record<string, string> = {
    avancar: "border-emerald-200 bg-emerald-50 text-emerald-800",
    talvez: "border-amber-200 bg-amber-50 text-amber-800",
    rejeitar: "border-rose-200 bg-rose-50 text-rose-800",
  };

  return (
    <div className="grid gap-1.5">
      <button
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        disabled={loading}
        onClick={handleClick}
        type="button"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : result ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <BrainCircuit className="h-4 w-4" aria-hidden="true" />
        )}
        {loading ? "Analyzing..." : result ? `${result.score}% match — Re-analyze` : "Analyze with AI"}
      </button>

      {result ? (
        <div className={`rounded-md border px-2 py-2 text-xs font-medium leading-5 ${recommendationTone[result.recommendation] ?? "border-slate-200 bg-slate-50 text-slate-700"}`}>
          <span className="font-semibold">{recommendationLabel[result.recommendation] ?? result.recommendation}</span>
          {result.short_summary ? ` — ${result.short_summary}` : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-2 text-xs leading-5 text-rose-700">
          <p className="font-semibold">Analysis unavailable</p>
          <p className="mt-0.5">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
