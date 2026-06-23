import { RecruitmentDashboard } from "@/components/recruitment-dashboard";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.organization.id);
  const dashboardKey = [
    data.pipelineStages.map((stage) => stage.id).join(","),
    Object.entries(data.initialPipeline)
      .map(([stageId, candidateIds]) => `${stageId}:${candidateIds.join(".")}`)
      .join("|"),
    data.candidates.map((candidate) => `${candidate.id}:${candidate.score}`).join(","),
  ].join("::");

  return <RecruitmentDashboard data={data} key={dashboardKey} />;
}
