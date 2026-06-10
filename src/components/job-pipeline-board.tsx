"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
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
import {
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import { movePipelineCandidate } from "@/app/pipeline/actions";
import type { Candidate, PipelineStage } from "@/lib/types";

type PipelineSnapshot = Record<string, string[]>;

type PipelineMove = {
  destinationStageId: string;
  pipeline: PipelineSnapshot;
  sourceStageId: string;
};

function getScoreTone(score: number) {
  if (score >= 90) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (score >= 75) {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (score > 0) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getStageForCandidate(pipeline: PipelineSnapshot, candidateId: string) {
  return Object.entries(pipeline).find(([, ids]) => ids.includes(candidateId))?.[0];
}

function getNextPipelineAfterDrag({
  activeId,
  current,
  overId,
}: {
  activeId: string;
  current: PipelineSnapshot;
  overId: string;
}): PipelineMove | null {
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

  return (
    <article
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm outline-none transition ${
        isDragging ? "scale-[1.01] border-slate-400 shadow-lg" : "hover:border-slate-300 hover:shadow-md"
      }`}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-950">{candidate.name}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">{candidate.role}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(candidate.score)}`}>
          {candidate.score}%
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {candidate.skills.slice(0, 3).map((skill) => (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600" key={skill}>
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="truncate">{candidate.source}</span>
        <span className="shrink-0">{candidate.availability}</span>
      </div>
    </article>
  );
}

function PipelineColumn({
  candidateIds,
  candidateMap,
  stage,
}: {
  candidateIds: string[];
  candidateMap: Map<string, Candidate>;
  stage: PipelineStage;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });
  const stageCandidates = candidateIds.map((id) => candidateMap.get(id)).filter(Boolean) as Candidate[];

  return (
    <section
      className={`flex min-h-[420px] min-w-0 flex-col rounded-lg border border-slate-200 bg-slate-50 p-3 transition ${
        isOver ? "border-slate-400 bg-white" : ""
      }`}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stage.accent}`} />
          <h2 className="truncate text-sm font-semibold text-slate-900">{stage.title}</h2>
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

export function JobPipelineBoard({
  candidates,
  initialPipeline,
  jobTitle,
  pipelineStages,
}: {
  candidates: Candidate[];
  initialPipeline: PipelineSnapshot;
  jobTitle: string;
  pipelineStages: PipelineStage[];
}) {
  const candidateMap = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidates[0]?.id ?? "");
  const [pipelineStatus, setPipelineStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pipelineMessage, setPipelineMessage] = useState("");
  const selectedCandidate = candidateMap.get(selectedCandidateId) ?? candidates[0];
  const selectedStageId = selectedCandidate ? getStageForCandidate(pipeline, selectedCandidate.id) : null;
  const selectedStage = pipelineStages.find((stage) => stage.id === selectedStageId)?.title ?? "Talent Pool";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = String(active.id);
    const previousPipeline = pipeline;
    const nextMove = getNextPipelineAfterDrag({
      activeId,
      current: pipeline,
      overId: String(over.id),
    });

    if (!nextMove) {
      return;
    }

    setPipeline(nextMove.pipeline);
    setSelectedCandidateId(activeId);
    setPipelineStatus("saving");
    setPipelineMessage("Saving pipeline...");

    void movePipelineCandidate({
      candidateId: activeId,
      destinationStageId: nextMove.destinationStageId,
      pipeline: nextMove.pipeline,
      sourceStageId: nextMove.sourceStageId,
    })
      .then((result) => {
        setPipelineStatus("saved");
        setPipelineMessage(
          result.queuedMessages > 0 ? `Saved. ${result.queuedMessages} automation email queued.` : "Pipeline saved.",
        );
      })
      .catch(() => {
        setPipeline(previousPipeline);
        setPipelineStatus("error");
        setPipelineMessage("Pipeline update failed.");
      });
  }

  return (
    <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">Pipeline</p>
            <p className="mt-1 truncate text-xs text-slate-500">{jobTitle}</p>
          </div>
          {pipelineStatus !== "idle" ? (
            <span
              aria-live="polite"
              className={`inline-flex h-9 w-fit items-center rounded-lg px-3 text-xs font-semibold ${
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
        </div>

        {candidates.length > 0 ? (
          <DndContext
            collisionDetection={closestCenter}
            id="job-pipeline-dnd"
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm font-semibold text-slate-950">No applications yet</p>
            <p className="mt-1 text-sm text-slate-500">Candidates added to this role will appear in this pipeline.</p>
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {selectedCandidate ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">Candidate</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {selectedStage} - {selectedCandidate.source}
                  </p>
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
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <Link
                  className="text-base font-semibold text-slate-950 transition hover:text-slate-600"
                  href={`/candidates/${selectedCandidate.id}`}
                >
                  {selectedCandidate.name}
                </Link>
                <p className="mt-1 text-sm text-slate-500">{selectedCandidate.role}</p>
                <div className="mt-3 grid gap-2 text-xs">
                  {[
                    { icon: Mail, label: selectedCandidate.email },
                    { icon: Phone, label: selectedCandidate.phone },
                    { icon: MapPin, label: selectedCandidate.location },
                  ].map((item) => (
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2" key={item.label}>
                      <item.icon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span className="truncate font-medium text-slate-600">{item.label}</span>
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
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    <p className="text-xs font-semibold uppercase text-emerald-700">Strengths</p>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                    {selectedCandidate.strengths.slice(0, 4).map((strength) => (
                      <li className="flex gap-2" key={strength}>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-amber-700">Review</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                    {selectedCandidate.risks.slice(0, 4).map((risk) => (
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
            <p className="text-sm text-slate-500">No candidate selected.</p>
          )}
        </section>
      </aside>
    </section>
  );
}
