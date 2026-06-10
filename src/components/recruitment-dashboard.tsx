"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppNavigationMenu, AppNavigationSidebar } from "@/components/app-navigation-menu";
import { LanguageToggle, useSiteLanguage } from "@/components/site-language-provider";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Inbox,
  Mail,
  MoreHorizontal,
  Search,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { Candidate, DashboardData, PipelineStage } from "@/lib/types";

function matchesSearch(values: Array<string | number | null | undefined>, query: string) {
  if (!query) {
    return true;
  }

  return values
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function candidateMatchesSearch(candidate: Candidate, query: string) {
  return matchesSearch(
    [
      candidate.name,
      candidate.role,
      candidate.location,
      candidate.source,
      candidate.experience,
      candidate.availability,
      candidate.salary,
      candidate.summary,
      candidate.score,
      ...candidate.skills,
      ...candidate.strengths,
      ...candidate.risks,
    ],
    query,
  );
}

function getScoreTone(score: number) {
  if (score >= 90) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (score >= 82) {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function getStageForCandidate(pipeline: Record<string, string[]>, candidateId: string) {
  return Object.entries(pipeline).find(([, ids]) => ids.includes(candidateId))?.[0];
}

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const searchText = [
    candidate.name,
    candidate.role,
    candidate.location,
    candidate.source,
    candidate.experience,
    candidate.availability,
    candidate.salary,
    candidate.summary,
    candidate.score,
    ...candidate.skills,
    ...candidate.strengths,
    ...candidate.risks,
  ]
    .join(" ")
    .toLowerCase();

  return (
    <article
      data-candidate-id={candidate.id}
      data-candidate-name={candidate.name}
      data-candidate-search-text={searchText}
      draggable
      className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm outline-none transition active:cursor-grabbing data-[dragging=true]:scale-[1.01] data-[dragging=true]:border-slate-400 data-[dragging=true]:opacity-60 data-[dragging=true]:shadow-lg hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-950">{candidate.name}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">{candidate.role}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(candidate.score)}`}>
          {candidate.score}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {candidate.skills.slice(0, 3).map((skill) => (
          <span key={skill} className="dashboard-chip rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{candidate.source}</span>
        <span>{candidate.availability}</span>
      </div>
    </article>
  );
}

function PipelineColumn({
  stage,
  candidateIds,
  candidateMap,
  searching,
  totalCount,
}: {
  stage: PipelineStage;
  candidateIds: string[];
  candidateMap: Map<string, Candidate>;
  searching?: boolean;
  totalCount?: number;
}) {
  const stageCandidates = candidateIds.map((id) => candidateMap.get(id)).filter(Boolean) as Candidate[];

  return (
    <section
      data-stage-id={stage.id}
      data-stage-title={stage.title}
      className="dashboard-overlay flex min-h-[420px] min-w-[260px] flex-1 flex-col rounded-lg border p-3 transition data-[drag-over=true]:border-slate-400 data-[drag-over=true]:bg-white"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stage.accent}`} />
          <h2 className="truncate text-sm font-semibold text-slate-900">{stage.title}</h2>
        </div>
        <span
          className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
          data-stage-count
          data-stage-total={candidateIds.length}
        >
          {searching ? `${candidateIds.length}/${totalCount ?? candidateIds.length}` : candidateIds.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3" data-stage-candidate-list>
        {stageCandidates.map((candidate) => (
          <CandidateCard candidate={candidate} key={candidate.id} />
        ))}
        <div
          className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-8 text-center text-sm font-medium text-slate-500"
          data-stage-empty
          hidden={!searching || stageCandidates.length > 0}
        >
          No matching candidates in this stage.
        </div>
      </div>
    </section>
  );
}

function useDashboardInteractions() {
  useEffect(() => {
    const statusBaseClass = "inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold";
    const statusClasses = {
      error: `${statusBaseClass} bg-rose-50 text-rose-700 ring-1 ring-rose-200`,
      saved: `${statusBaseClass} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`,
      saving: `${statusBaseClass} bg-sky-50 text-sky-700 ring-1 ring-sky-200`,
    };
    let draggedCard: HTMLElement | null = null;
    let originalParent: HTMLElement | null = null;
    let originalNextSibling: ChildNode | null = null;
    let sourceStageId = "";

    const getRoot = () => document.querySelector<HTMLElement>("[data-dashboard-root]");
    const getSearchInput = () => getRoot()?.querySelector<HTMLInputElement>("[data-dashboard-search]");
    const getClearButton = () => getRoot()?.querySelector<HTMLButtonElement>("[data-dashboard-search-clear]");
    const getSubtitle = () => getRoot()?.querySelector<HTMLElement>("[data-pipeline-subtitle]");
    const getStatus = () => getRoot()?.querySelector<HTMLElement>("[data-pipeline-status]");
    const getCandidateCards = (scope: ParentNode | null | undefined = getRoot()) =>
      Array.from(scope?.querySelectorAll<HTMLElement>("[data-candidate-id]") ?? []);
    const closestElement = (target: EventTarget | null, selector: string) =>
      target instanceof Element ? target.closest<HTMLElement>(selector) : null;

    function updateStageCounts(query: string) {
      getRoot()?.querySelectorAll<HTMLElement>("[data-stage-id]").forEach((stage) => {
        const cards = getCandidateCards(stage);
        const visibleCount = cards.filter((card) => !card.hidden).length;
        const count = stage.querySelector<HTMLElement>("[data-stage-count]");
        const empty = stage.querySelector<HTMLElement>("[data-stage-empty]");

        if (count) {
          count.textContent = query ? `${visibleCount}/${cards.length}` : String(cards.length);
          count.dataset.stageTotal = String(cards.length);
        }

        if (empty) {
          empty.hidden = !query || visibleCount > 0;
        }
      });
    }

    function updateSearch() {
      const input = getSearchInput();
      const clearButton = getClearButton();
      const subtitle = getSubtitle();
      const query = (input?.value ?? "").trim().toLowerCase();
      let matches = 0;

      getCandidateCards().forEach((card) => {
        const searchText = card.dataset.candidateSearchText || card.textContent?.toLowerCase() || "";
        const isMatch = !query || searchText.includes(query);
        card.hidden = !isMatch;
        if (isMatch) {
          matches += 1;
        }
      });

      if (clearButton) {
        clearButton.hidden = !query;
      }

      if (subtitle) {
        subtitle.textContent = query
          ? `${matches} matching candidate${matches === 1 ? "" : "s"}`
          : subtitle.dataset.defaultText || "Senior Full Stack Engineer - Remote LATAM";
      }

      updateStageCounts(query);
    }

    function setStatus(kind: keyof typeof statusClasses, message: string) {
      const status = getStatus();

      if (!status) {
        return;
      }

      status.className = statusClasses[kind] || statusClasses.saving;
      status.textContent = message;
      status.hidden = false;
    }

    function snapshotPipeline() {
      const snapshot: Record<string, string[]> = {};

      getRoot()?.querySelectorAll<HTMLElement>("[data-stage-id]").forEach((stage) => {
        const stageId = stage.dataset.stageId;
        if (!stageId) {
          return;
        }

        snapshot[stageId] = getCandidateCards(stage)
          .map((card) => card.dataset.candidateId)
          .filter((candidateId): candidateId is string => Boolean(candidateId));
      });

      return snapshot;
    }

    function getInsertBeforeCard(list: HTMLElement, pointerY: number) {
      return getCandidateCards(list)
        .filter((card) => card !== draggedCard && !card.hidden)
        .reduce<{ offset: number; card: HTMLElement | null }>(
          (closest, card) => {
            const rect = card.getBoundingClientRect();
            const offset = pointerY - rect.top - rect.height / 2;

            if (offset < 0 && offset > closest.offset) {
              return { offset, card };
            }

            return closest;
          },
          { offset: Number.NEGATIVE_INFINITY, card: null },
        ).card;
    }

    function moveDraggedCard(stage: HTMLElement, pointerY: number) {
      const list = stage.querySelector<HTMLElement>("[data-stage-candidate-list]");

      if (!draggedCard || !list) {
        return;
      }

      const beforeCard = getInsertBeforeCard(list, pointerY);

      if (beforeCard) {
        list.insertBefore(draggedCard, beforeCard);
      } else {
        list.appendChild(draggedCard);
      }

      updateSearch();
    }

    function resetDragState() {
      getRoot()?.querySelectorAll<HTMLElement>("[data-stage-id]").forEach((stage) => {
        delete stage.dataset.dragOver;
      });

      if (draggedCard) {
        delete draggedCard.dataset.dragging;
      }

      draggedCard = null;
      originalParent = null;
      originalNextSibling = null;
      sourceStageId = "";
    }

    function handleInput(event: Event) {
      if (event.target instanceof Element && event.target.matches("[data-dashboard-search]")) {
        updateSearch();
      }
    }

    function handleClick(event: MouseEvent) {
      const clearButton = closestElement(event.target, "[data-dashboard-search-clear]");

      if (!clearButton) {
        return;
      }

      const input = getSearchInput();
      if (input) {
        input.value = "";
        input.focus();
      }
      updateSearch();
    }

    function handleDragStart(event: DragEvent) {
      const card = closestElement(event.target, "[data-candidate-id]");

      if (!card || card.hidden) {
        return;
      }

      const stage = card.closest<HTMLElement>("[data-stage-id]");
      draggedCard = card;
      originalParent = card.parentElement;
      originalNextSibling = card.nextSibling;
      sourceStageId = stage?.dataset.stageId || "";
      card.dataset.dragging = "true";
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.dataset.candidateId || "");
      }
    }

    function handleDragOver(event: DragEvent) {
      const stage = closestElement(event.target, "[data-stage-id]");

      if (!stage || !draggedCard) {
        return;
      }

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
      getRoot()?.querySelectorAll<HTMLElement>("[data-stage-id]").forEach((item) => {
        if (item !== stage) {
          delete item.dataset.dragOver;
        }
      });
      stage.dataset.dragOver = "true";
      moveDraggedCard(stage, event.clientY);
    }

    async function handleDrop(event: DragEvent) {
      const stage = closestElement(event.target, "[data-stage-id]");

      if (!stage || !draggedCard) {
        resetDragState();
        return;
      }

      event.preventDefault();
      moveDraggedCard(stage, event.clientY);

      const movedCard = draggedCard;
      const fallbackParent = originalParent;
      const fallbackNextSibling = originalNextSibling;
      const candidateId = movedCard.dataset.candidateId || "";
      const destinationStageId = stage.dataset.stageId || "";
      const pipeline = snapshotPipeline();

      if (!candidateId || !sourceStageId || !destinationStageId) {
        resetDragState();
        return;
      }

      setStatus("saving", "Saving pipeline movement...");

      try {
        const response = await fetch("/api/pipeline/move", {
          body: JSON.stringify({
            candidateId,
            destinationStageId,
            pipeline,
            sourceStageId,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Pipeline update failed.");
        }

        const result = (await response.json()) as { queuedMessages?: number };
        setStatus(
          "saved",
          result.queuedMessages && result.queuedMessages > 0
            ? `Saved. ${result.queuedMessages} automation email queued.`
            : "Saved to pipeline.",
        );
      } catch {
        if (fallbackParent && movedCard) {
          fallbackParent.insertBefore(movedCard, fallbackNextSibling);
        }
        updateSearch();
        setStatus("error", "Pipeline movement was not saved.");
      } finally {
        resetDragState();
        updateStageCounts((getSearchInput()?.value ?? "").trim().toLowerCase());
      }
    }

    function handleDragEnd() {
      resetDragState();
      updateStageCounts((getSearchInput()?.value ?? "").trim().toLowerCase());
    }

    document.addEventListener("input", handleInput);
    document.addEventListener("click", handleClick);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    document.addEventListener("dragend", handleDragEnd);
    updateSearch();

    return () => {
      document.removeEventListener("input", handleInput);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
      document.removeEventListener("dragend", handleDragEnd);
    };
  }, []);
}

export function RecruitmentDashboard({ data }: { data: DashboardData }) {
  const { analytics, candidates, emailTemplates, initialPipeline, interviews, jobs, pipelineStages } = data;
  useDashboardInteractions();
  const { t } = useSiteLanguage();
  const candidateMap = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);
  const [pipeline] = useState(initialPipeline);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidates[0]?.id ?? "");
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searching = normalizedSearchQuery.length > 0;
  const filteredCandidates = useMemo(
    () => candidates.filter((candidate) => candidateMatchesSearch(candidate, normalizedSearchQuery)),
    [candidates, normalizedSearchQuery],
  );
  const filteredCandidateIds = useMemo(
    () => new Set(filteredCandidates.map((candidate) => candidate.id)),
    [filteredCandidates],
  );
  const visiblePipeline = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(pipeline).map(([stageId, candidateIds]) => [
          stageId,
          searching ? candidateIds.filter((candidateId) => filteredCandidateIds.has(candidateId)) : candidateIds,
        ]),
      ),
    [filteredCandidateIds, pipeline, searching],
  );
  const selectedCandidate =
    (searching && filteredCandidates.length > 0 && !filteredCandidateIds.has(selectedCandidateId)
      ? filteredCandidates[0]
      : candidateMap.get(selectedCandidateId)) ?? candidates[0] ?? null;
  const selectedStageId = selectedCandidate ? getStageForCandidate(pipeline, selectedCandidate.id) : undefined;
  const selectedStage = selectedStageId
    ? pipelineStages.find((stage) => stage.id === selectedStageId)?.title ?? "Talent Pool"
    : "Talent Pool";
  const candidateOptions = searching && filteredCandidates.length > 0 ? filteredCandidates : candidates;
  const visibleCandidates = searching ? filteredCandidates : candidates;
  const visibleJobs = useMemo(
    () =>
      jobs.filter((job) =>
        matchesSearch(
          [
            job.title,
            job.department,
            job.location,
            job.status,
            job.hiringManager,
            job.candidates,
            job.avgScore,
          ],
          normalizedSearchQuery,
        ),
      ),
    [jobs, normalizedSearchQuery],
  );

  const bestMatches = [...visibleCandidates].sort((a, b) => b.score - a.score).slice(0, 4);
  const pipelineSubtitle = jobs[0]
    ? `${jobs[0].title} - ${jobs[0].location}`
    : "Create a job to start your first pipeline";

  return (
    <div className="dashboard-shell min-h-screen text-slate-950" data-dashboard-root>
      <div className="grid min-h-screen lg:grid-cols-[264px_minmax(0,1fr)]">
        <AppNavigationSidebar className="dashboard-surface" />

        <main className="min-w-0 overflow-hidden">
          <header className="dashboard-surface sticky top-0 z-10 border-b backdrop-blur">
            <div className="grid min-h-16 gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <AppNavigationMenu className="lg:hidden" />
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <p className="text-xs font-semibold uppercase text-slate-500">{t("dashboard.activeCenter")}</p>
                  <label className="relative min-w-0 lg:max-w-xl">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      aria-label={t("dashboard.searchAria")}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                      data-dashboard-search
                      data-i18n-aria="dashboard.searchAria"
                      data-i18n-placeholder="dashboard.searchPlaceholder"
                      onChange={(event) => setSearchQuery(event.currentTarget.value)}
                      onInput={(event) => setSearchQuery(event.currentTarget.value)}
                      placeholder={t("dashboard.searchPlaceholder")}
                      type="search"
                      value={searchQuery}
                    />
                    <button
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      data-dashboard-search-clear
                      hidden={!searching}
                      onClick={() => setSearchQuery("")}
                      type="button"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LanguageToggle className="shrink-0" />
                <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="/candidates#resume-parser">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span data-i18n-key="dashboard.resume">{t("dashboard.resume")}</span>
                </Link>
                <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="/applications">
                  <Inbox className="h-4 w-4" aria-hidden="true" />
                  <span data-i18n-key="dashboard.intake">{t("dashboard.intake")}</span>
                </Link>
                <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800" href="/jobs#new-job">
                  <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                  <span data-i18n-key="dashboard.job">{t("dashboard.job")}</span>
                </Link>
              </div>
            </div>
          </header>

          <div className="space-y-5 p-4 lg:p-6">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {analytics.metrics.map((metric, index) => {
                const MetricIcon = [BriefcaseBusiness, Users, Sparkles, Clock3][index] ?? BarChart3;

                return (
                <article className="dashboard-surface rounded-lg border p-4 shadow-sm" key={metric.label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                    <MetricIcon className={`h-5 w-5 ${metric.tone}`} aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{metric.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
                </article>
                );
              })}
            </section>

            <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="dashboard-surface min-w-0 rounded-lg border p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{t("dashboard.atsPipeline")}</p>
                    <p
                      className="mt-1 text-xs text-slate-500"
                      data-default-text={pipelineSubtitle}
                      data-pipeline-subtitle
                    >
                      {searching
                        ? `${filteredCandidates.length} matching candidate${filteredCandidates.length === 1 ? "" : "s"}`
                        : pipelineSubtitle}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      aria-live="polite"
                      className="inline-flex h-9 items-center rounded-lg bg-sky-50 px-3 text-xs font-semibold text-sky-700 ring-1 ring-sky-200"
                      data-pipeline-status
                      hidden
                    />
                    <Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/candidates#resume-parser">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      {t("dashboard.parse")}
                    </Link>
                    <Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/matching">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      {t("dashboard.rank")}
                    </Link>
                    <details className="dashboard-actions-menu relative">
                      <summary
                        aria-label={t("dashboard.morePipelineActions")}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </summary>
                      <div className="absolute right-0 top-11 z-20 grid w-56 gap-1 rounded-lg border border-slate-200 bg-white p-2 text-sm font-semibold text-slate-700 shadow-lg">
                        <Link className="rounded-md px-3 py-2 hover:bg-slate-50" href="/jobs">
                          {t("dashboard.manageJobs")}
                        </Link>
                        <Link className="rounded-md px-3 py-2 hover:bg-slate-50" href="/email-automation">
                          {t("dashboard.emailAutomation")}
                        </Link>
                        <Link className="rounded-md px-3 py-2 hover:bg-slate-50" href="/analytics">
                          {t("nav.analytics")}
                        </Link>
                        <Link className="rounded-md px-3 py-2 hover:bg-slate-50" href="/careers">
                          {t("dashboard.careersPage")}
                        </Link>
                      </div>
                    </details>
                  </div>
                </div>
                <div className="flex max-w-full gap-3 overflow-x-auto pb-1 overscroll-x-contain" data-pipeline-board>
                  {pipelineStages.length > 0 ? (
                    pipelineStages.map((stage) => (
                      <PipelineColumn
                        candidateIds={visiblePipeline[stage.id] ?? []}
                        candidateMap={candidateMap}
                        key={stage.id}
                        searching={searching}
                        stage={stage}
                        totalCount={(pipeline[stage.id] ?? []).length}
                      />
                    ))
                  ) : (
                    <div className="dashboard-overlay flex min-h-[360px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
                      <BriefcaseBusiness className="h-8 w-8 text-slate-400" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-slate-950">No active job pipeline yet.</p>
                      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                        Create your first job to generate the ATS stages and start moving candidates through the workflow.
                      </p>
                      <Link className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800" href="/jobs#new-job">
                        <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                        Create first job
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <aside className="space-y-5">
                <section className="dashboard-surface rounded-lg border p-4 shadow-sm">
                  {selectedCandidate ? (
                    <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">Candidate Detail</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{selectedStage} - {selectedCandidate.source}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(selectedCandidate.score)}`}>
                      {selectedCandidate.score}% match
                    </span>
                  </div>

                  <div className="mt-4">
                    <select
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-400"
                      onChange={(event) => setSelectedCandidateId(event.target.value)}
                      value={selectedCandidate.id}
                    >
                      {candidateOptions.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <h3 className="text-base font-semibold text-slate-950">{selectedCandidate.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{selectedCandidate.role}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      {[
                        ["Location", selectedCandidate.location],
                        ["Experience", selectedCandidate.experience],
                        ["Availability", selectedCandidate.availability],
                        ["Target", selectedCandidate.salary],
                      ].map(([label, value]) => (
                        <div className="dashboard-muted rounded-lg p-2" key={label}>
                          <p className="font-medium text-slate-500">{label}</p>
                          <p className="mt-1 font-semibold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{selectedCandidate.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {selectedCandidate.skills.map((skill) => (
                        <span className="dashboard-chip rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-emerald-700">AI strengths</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                        {selectedCandidate.strengths.map((strength) => (
                          <li className="flex gap-2" key={strength}>
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-amber-700">Review notes</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                        {selectedCandidate.risks.map((risk) => (
                          <li className="flex gap-2" key={risk}>
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                    </>
                  ) : (
                    <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                      <Users className="h-8 w-8 text-slate-400" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-slate-950">No candidate selected.</p>
                      <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
                        Upload a resume or add a candidate to start reviewing profiles here.
                      </p>
                      <Link className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href="/candidates#resume-parser">
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        Add candidate
                      </Link>
                    </div>
                  )}
                </section>
              </aside>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="dashboard-surface rounded-lg border p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Open Jobs</p>
                    <p className="mt-1 text-xs text-slate-500">Pipeline volume and score health by role</p>
                  </div>
                  <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Open jobs actions" type="button">
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid gap-3 2xl:hidden">
                  {visibleJobs.map((job) => (
                    <article className="dashboard-muted rounded-lg border border-slate-200 p-3" key={job.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link className="font-semibold text-slate-950 transition hover:text-slate-600" href={`/jobs/${job.id}`}>
                            {job.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-500">{job.department} - {job.location}</p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {job.status}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                        <div className="rounded-md bg-white px-3 py-2">
                          <p className="font-medium text-slate-500">Candidates</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{job.candidates}</p>
                        </div>
                        <div className="rounded-md bg-white px-3 py-2">
                          <p className="font-medium text-slate-500">Avg score</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{job.avgScore}%</p>
                        </div>
                        <div className="rounded-md bg-white px-3 py-2">
                          <p className="font-medium text-slate-500">Manager</p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-950">{job.hiringManager}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                  {visibleJobs.length === 0 ? (
                    <div className="dashboard-muted rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm font-medium text-slate-500">
                      No jobs match this search.
                    </div>
                  ) : null}
                </div>
                <div className="hidden 2xl:block">
                  <table className="w-full table-fixed border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="py-2 pr-3 font-semibold">Role</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Candidates</th>
                        <th className="px-3 py-2 font-semibold">Avg score</th>
                        <th className="px-3 py-2 font-semibold">Manager</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleJobs.map((job) => (
                        <tr className="border-b border-slate-100 last:border-0" key={job.id}>
                          <td className="py-3 pr-3">
                            <Link className="font-semibold text-slate-950 transition hover:text-slate-600" href={`/jobs/${job.id}`}>
                              {job.title}
                            </Link>
                            <p className="mt-0.5 text-xs text-slate-500">{job.department} - {job.location}</p>
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                              {job.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{job.candidates}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${job.avgScore}%` }} />
                              </div>
                              <span className="text-slate-600">{job.avgScore}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{job.hiringManager}</td>
                        </tr>
                      ))}
                      {visibleJobs.length === 0 ? (
                        <tr>
                          <td className="py-6 text-center text-sm font-medium text-slate-500" colSpan={5}>
                            No jobs match this search.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
                <section className="dashboard-surface rounded-lg border p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-sky-700" aria-hidden="true" />
                      <p className="text-sm font-semibold text-slate-950">Interview Schedule</p>
                    </div>
                    <Link className="text-xs font-semibold text-slate-500 transition hover:text-slate-950" href="/interviews">
                      View
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {interviews.map((interview) => (
                      <article className="rounded-lg border border-slate-200 p-3" key={interview.id}>
                        <p className="text-sm font-semibold text-slate-950">{interview.candidate}</p>
                        <p className="mt-1 text-xs text-slate-500">{interview.role}</p>
                        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-700">{interview.time}</span>
                          <span className="rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-700">{interview.type}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="dashboard-surface rounded-lg border p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                      <p className="text-sm font-semibold text-slate-950">Email Automation</p>
                    </div>
                    <Link className="text-xs font-semibold text-slate-500 transition hover:text-slate-950" href="/email-automation">
                      View
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {emailTemplates.map((template) => (
                      <article className="rounded-lg border border-slate-200 p-3" key={template.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{template.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{template.trigger}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            {template.sent}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="dashboard-surface rounded-lg border p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-700" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-950">Top AI Matches</p>
                </div>
                <div className="space-y-3">
                  {bestMatches.map((candidate) => (
                    <button
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      key={candidate.id}
                      onClick={() => setSelectedCandidateId(candidate.id)}
                      type="button"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{candidate.name}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{candidate.role}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(candidate.score)}`}>
                        {candidate.score}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="dashboard-surface rounded-lg border p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-rose-700" aria-hidden="true" />
                    <p className="text-sm font-semibold text-slate-950">Hiring Analytics</p>
                  </div>
                  <Link className="text-xs font-semibold text-slate-500 transition hover:text-slate-950" href="/analytics">
                    View
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {analytics.rates.map((item) => (
                    <article className="rounded-lg border border-slate-200 p-3" key={item.label}>
                      <p className="text-xs font-medium text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}%</p>
                      <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                      </div>
                    </article>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <p className="text-sm font-semibold text-slate-950">Resume parser queue</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    {analytics.resumeParser.map(({ color, label, value }) => (
                      <div className="dashboard-muted flex items-center justify-between rounded-md px-3 py-2" key={label}>
                        <span className="text-slate-600">{label}</span>
                        <span className={`font-semibold ${color}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
