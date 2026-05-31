"use server";

import { revalidatePath } from "next/cache";
import {
  ApplicationStatus,
  AutomationTrigger,
  PipelineCategory,
} from "@/generated/prisma/client";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { queueAutomationEmails } from "@/lib/email-automation";
import { prisma } from "@/lib/prisma";

type PipelineSnapshot = Record<string, string[]>;

type MovePipelineCandidateInput = {
  candidateId: string;
  destinationStageId: string;
  pipeline: PipelineSnapshot;
  sourceStageId: string;
};

function assertString(value: string, label: string) {
  if (!value || typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }
}

function normalizePipelineSnapshot(pipeline: PipelineSnapshot) {
  return Object.entries(pipeline).map(([stageId, candidateIds]) => ({
    stageId,
    candidateIds: Array.isArray(candidateIds)
      ? candidateIds.filter((candidateId) => typeof candidateId === "string" && candidateId.length > 0)
      : [],
  }));
}

function getApplicationStatus(category: PipelineCategory) {
  if (category === PipelineCategory.HIRED) {
    return ApplicationStatus.HIRED;
  }

  if (category === PipelineCategory.REJECTED) {
    return ApplicationStatus.REJECTED;
  }

  return ApplicationStatus.ACTIVE;
}

function getTerminalDates({
  category,
  currentHiredAt,
  currentRejectedAt,
  now,
}: {
  category: PipelineCategory;
  currentHiredAt: Date | null;
  currentRejectedAt: Date | null;
  now: Date;
}) {
  if (category === PipelineCategory.HIRED) {
    return {
      hiredAt: currentHiredAt ?? now,
      rejectedAt: null,
    };
  }

  if (category === PipelineCategory.REJECTED) {
    return {
      hiredAt: null,
      rejectedAt: currentRejectedAt ?? now,
    };
  }

  return {
    hiredAt: null,
    rejectedAt: null,
  };
}

export async function movePipelineCandidate(input: MovePipelineCandidateInput) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;

  assertString(input.candidateId, "Candidate id");
  assertString(input.sourceStageId, "Source stage id");
  assertString(input.destinationStageId, "Destination stage id");

  const pipelineEntries = normalizePipelineSnapshot(input.pipeline);
  const stageIds = pipelineEntries.map((entry) => entry.stageId);

  if (!stageIds.includes(input.sourceStageId) || !stageIds.includes(input.destinationStageId)) {
    throw new Error("Pipeline stage snapshot is incomplete.");
  }

  const stages = await prisma.pipelineStage.findMany({
    where: {
      id: {
        in: stageIds,
      },
      organizationId: organization.id,
    },
    select: {
      id: true,
      name: true,
      category: true,
      jobId: true,
    },
  });

  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const destinationStage = stageById.get(input.destinationStageId);
  const sourceStage = stageById.get(input.sourceStageId);
  const jobIds = new Set(stages.map((stage) => stage.jobId));

  if (!destinationStage || !sourceStage || jobIds.size !== 1) {
    throw new Error("Pipeline stages must belong to the same job.");
  }

  const jobId = destinationStage.jobId;
  const destinationCandidateIds = input.pipeline[input.destinationStageId] ?? [];
  const destinationPosition = destinationCandidateIds.indexOf(input.candidateId);

  if (destinationPosition < 0) {
    throw new Error("Moved candidate must be present in the destination stage snapshot.");
  }

  const application = await prisma.application.findFirst({
    where: {
      candidateId: input.candidateId,
      jobId,
      organizationId: organization.id,
    },
    include: {
      candidate: true,
      job: true,
      stage: true,
    },
  });

  if (!application) {
    throw new Error("Application not found for this pipeline.");
  }

  const now = new Date();
  const stageChanged = application.stageId !== input.destinationStageId;
  const nextStatus = getApplicationStatus(destinationStage.category);
  const terminalDates = getTerminalDates({
    category: destinationStage.category,
    currentHiredAt: application.hiredAt,
    currentRejectedAt: application.rejectedAt,
    now,
  });

  await prisma.$transaction(async (tx) => {
    for (const entry of pipelineEntries) {
      const stage = stageById.get(entry.stageId);

      if (!stage) {
        continue;
      }

      for (const [index, candidateId] of entry.candidateIds.entries()) {
        await tx.application.updateMany({
          where: {
            candidateId,
            jobId,
            organizationId: organization.id,
          },
          data: {
            pipelinePosition: index,
            stageId: stage.id,
          },
        });
      }
    }

    await tx.application.update({
      where: {
        id: application.id,
      },
      data: {
        ...terminalDates,
        pipelinePosition: destinationPosition,
        stageEnteredAt: stageChanged ? now : application.stageEnteredAt,
        stageId: destinationStage.id,
        status: nextStatus,
      },
    });
  });

  const queuedMessages = stageChanged
    ? await queueAutomationEmails({
        applicationId: application.id,
        organizationId: organization.id,
        stageId: destinationStage.id,
        trigger: AutomationTrigger.STAGE_CHANGED,
      })
    : [];

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      applicationId: application.id,
      candidateId: application.candidateId,
      jobId,
      action: stageChanged ? "application.stage_changed" : "application.pipeline_reordered",
      entityType: "application",
      entityId: application.id,
      metadata: {
        automationMessagesQueued: queuedMessages.length,
        candidateName: application.candidate.name,
        destinationPosition,
        fromStage: application.stage?.name ?? sourceStage.name,
        fromStageId: application.stageId,
        jobTitle: application.job.title,
        toStage: destinationStage.name,
        toStageId: destinationStage.id,
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/analytics");
  revalidatePath("/candidates");
  revalidatePath("/email-automation");
  revalidatePath("/interviews");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/matching");

  return {
    action: stageChanged ? "stage_changed" : "reordered",
    queuedMessages: queuedMessages.length,
  };
}
