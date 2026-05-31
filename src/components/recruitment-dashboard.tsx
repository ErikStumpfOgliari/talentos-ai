"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { movePipelineCandidate } from "@/app/pipeline/actions";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Gauge,
  Inbox,
  LogOut,
  Mail,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import type { Candidate, DashboardData, PipelineStage } from "@/lib/types";

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

function getNextPipelineAfterDrag({
  activeId,
  current,
  overId,
}: {
  activeId: string;
  current: Record<string, string[]>;
  overId: string;
}) {
  const sourceStageId = getStageForCandidate(current, activeId);
  const destinationStageId = current[overId] ? overId : getStageForCandidate(current, overId);

  if (!sourceStageId || !destinationStageId) {
    return null;
  }

  const sourceItems = current[sourceStageId] ?? [];
  const destinationItems = current[destinationStageId] ?? [];
  const sourceIndex = sourceItems.indexOf(activeId);

  if (sourceIndex < 0) {
    return null;
  }

  if (sourceStageId === destinationStageId) {
    const overIndex = destinationItems.indexOf(overId);

    if (overIndex < 0 || sourceIndex === overIndex) {
      return null;
    }

    return {
      destinationStageId,
      pipeline: {
        ...current,
        [sourceStageId]: arrayMove(sourceItems, sourceIndex, overIndex),
      },
      sourceStageId,
    };
  }

  const overIndex = destinationItems.indexOf(overId);
  const nextDestinationIndex = overIndex >= 0 ? overIndex : destinationItems.length;

  return {
    destinationStageId,
    pipeline: {
      ...current,
      [sourceStageId]: sourceItems.filter((id) => id !== activeId),
      [destinationStageId]: [
        ...destinationItems.slice(0, nextDestinationIndex),
        activeId,
        ...destinationItems.slice(nextDestinationIndex),
      ],
    },
    sourceStageId,
  };
}

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: candidate.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm outline-none transition ${
        isDragging ? "scale-[1.01] border-slate-400 shadow-lg" : "hover:border-slate-300 hover:shadow-md"
      }`}
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
          <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
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
}: {
  stage: PipelineStage;
  candidateIds: string[];
  candidateMap: Map<string, Candidate>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const stageCandidates = candidateIds.map((id) => candidateMap.get(id)).filter(Boolean) as Candidate[];

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[420px] min-w-[260px] flex-1 flex-col rounded-lg border border-slate-200 bg-slate-50 p-3 transition ${
        isOver ? "border-slate-400 bg-white" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${stage.accent}`} />
          <h2 className="text-sm font-semibold text-slate-900">{stage.title}</h2>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
          {candidateIds.length}
        </span>
      </div>
      <SortableContext items={candidateIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-3">
          {stageCandidates.map((candidate) => (
            <CandidateCard candidate={candidate} key={candidate.id} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

export function RecruitmentDashboard({ data }: { data: DashboardData }) {
  const { analytics, candidates, emailTemplates, initialPipeline, interviews, jobs, pipelineStages } = data;
  const candidateMap = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [pipelineStatus, setPipelineStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pipelineMessage, setPipelineMessage] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidates[0]?.id ?? "");
  const selectedCandidate = candidateMap.get(selectedCandidateId) ?? candidates[0];
  const selectedStageId = getStageForCandidate(pipeline, selectedCandidate.id);
  const selectedStage = pipelineStages.find((stage) => stage.id === selectedStageId)?.title ?? "Talent Pool";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const bestMatches = [...candidates].sort((a, b) => b.score - a.score).slice(0, 4);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const previousPipeline = pipeline;
    const nextMove = getNextPipelineAfterDrag({
      activeId,
      current: pipeline,
      overId,
    });

    if (!nextMove) {
      return;
    }

    setPipeline(nextMove.pipeline);
    setSelectedCandidateId(activeId);
    setPipelineStatus("saving");
    setPipelineMessage("Saving pipeline movement...");

    void movePipelineCandidate({
      candidateId: activeId,
      destinationStageId: nextMove.destinationStageId,
      pipeline: nextMove.pipeline,
      sourceStageId: nextMove.sourceStageId,
    })
      .then((result) => {
        setPipelineStatus("saved");
        setPipelineMessage(
          result.queuedMessages > 0
            ? `Saved. ${result.queuedMessages} automation email queued.`
            : "Saved to pipeline.",
        );
      })
      .catch(() => {
        setPipeline(previousPipeline);
        setPipelineStatus("error");
        setPipelineMessage("Pipeline movement was not saved.");
      });
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[264px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">TalentOS AI</p>
              <p className="text-xs text-slate-500">Recruitment CRM</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4 text-sm font-medium text-slate-600">
            {[
              { icon: BarChart3, label: "Dashboard", active: true, href: "/" },
              { icon: BriefcaseBusiness, label: "Jobs", href: "/jobs" },
              { icon: Users, label: "Candidates", href: "/candidates" },
              { icon: Gauge, label: "AI Matching", href: "/matching" },
              { icon: CalendarDays, label: "Interviews", href: "/interviews" },
              { icon: Activity, label: "Analytics", href: "/analytics" },
              { icon: Mail, label: "Email Automation", href: "/email-automation" },
              { icon: ShieldCheck, label: "Admin", href: "/admin" },
              { icon: Settings, label: "Settings", href: "/admin#organization" },
            ].map((item) => (
              item.href ? (
                <Link
                  className={`flex h-10 items-center gap-3 rounded-lg px-3 text-left transition ${
                    item.active ? "bg-slate-950 text-white" : "hover:bg-slate-100 hover:text-slate-950"
                  }`}
                  href={item.href}
                  key={item.label}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button
                className={`flex h-10 items-center gap-3 rounded-lg px-3 text-left transition ${
                  item.active ? "bg-slate-950 text-white" : "hover:bg-slate-100 hover:text-slate-950"
                }`}
                key={item.label}
                type="button"
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
              )
            ))}
          </nav>
          <div className="border-t border-slate-200 p-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Organization</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">Northstar Recruiting</p>
              <p className="mt-1 text-xs text-slate-500">12 users - Pro workspace</p>
            </div>
            <Link
              className="mt-2 flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href="/logout"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Link>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between lg:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-slate-500">Active workspace</p>
                <h1 className="truncate text-xl font-semibold text-slate-950 md:text-2xl">AI Recruitment Command Center</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[220px] flex-1 md:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    placeholder="Search candidates, jobs, skills"
                    type="search"
                  />
                </label>
                <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="/candidates#resume-parser">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Resume
                </Link>
                <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800" href="/jobs#new-job">
                  <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                  Job
                </Link>
              </div>
            </div>
          </header>

          <div className="space-y-5 p-4 lg:p-6">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {analytics.metrics.map((metric, index) => {
                const MetricIcon = [BriefcaseBusiness, Users, Sparkles, Clock3][index] ?? BarChart3;

                return (
                <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={metric.label}>
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

            <section className="grid gap-5 2xl:grid-cols-[1fr_360px]">
              <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">ATS Pipeline</p>
                    <p className="mt-1 text-xs text-slate-500">Senior Full Stack Engineer - Remote LATAM</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {pipelineStatus !== "idle" ? (
                      <span
                        aria-live="polite"
                        className={`inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold ${
                          pipelineStatus === "error"
                            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                            : pipelineStatus === "saving"
                            ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        }`}
                      >
                        {pipelineMessage}
                      </span>
                    ) : null}
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      Parse
                    </button>
                    <Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/matching">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Rank
                    </Link>
                    <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="More pipeline actions" type="button">
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <DndContext
                  id="ats-pipeline-dnd"
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {pipelineStages.map((stage) => (
                      <PipelineColumn
                        candidateIds={pipeline[stage.id] ?? []}
                        candidateMap={candidateMap}
                        key={stage.id}
                        stage={stage}
                      />
                    ))}
                  </div>
                </DndContext>
              </div>

              <aside className="space-y-5">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
                      value={selectedCandidateId}
                    >
                      {candidates.map((candidate) => (
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
                        <div className="rounded-lg bg-slate-50 p-2" key={label}>
                          <p className="font-medium text-slate-500">{label}</p>
                          <p className="mt-1 font-semibold text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{selectedCandidate.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {selectedCandidate.skills.map((skill) => (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600" key={skill}>
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
                </section>
              </aside>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Open Jobs</p>
                    <p className="mt-1 text-xs text-slate-500">Pipeline volume and score health by role</p>
                  </div>
                  <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Open jobs actions" type="button">
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
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
                      {jobs.map((job) => (
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
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
                      <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2" key={label}>
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
