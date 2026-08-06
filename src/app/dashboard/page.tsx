import { RecruitmentDashboard } from "@/components/recruitment-dashboard";
import { TrialBanner } from "@/components/trial-banner";
import { requireSession } from "@/lib/auth";
import { getBillingPlan } from "@/lib/billing";
import { getDashboardData } from "@/lib/dashboard-data";
import { getBillingState } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const BANNER_STATUS = {
  trialing: "trialing",
  past_due: "past_due",
  canceled_grace: "canceled_grace",
} as const;

export default async function DashboardPage() {
  const session = await requireSession();
  const [data, billing] = await Promise.all([
    getDashboardData(session.organization.id),
    getBillingState(session.organization.id),
  ]);

  const bannerStatus =
    billing.reason in BANNER_STATUS
      ? BANNER_STATUS[billing.reason as keyof typeof BANNER_STATUS]
      : null;

  const trialBanner = bannerStatus ? (
    <TrialBanner
      daysRemaining={billing.trial.daysRemaining}
      planLabel={getBillingPlan(billing.entitledPlan).label}
      status={bannerStatus}
    />
  ) : null;

  const dashboardKey = [
    data.pipelineStages.map((stage) => stage.id).join(","),
    Object.entries(data.initialPipeline)
      .map(([stageId, candidateIds]) => `${stageId}:${candidateIds.join(".")}`)
      .join("|"),
    data.candidates.map((candidate) => `${candidate.id}:${candidate.score}`).join(","),
  ].join("::");

  return <RecruitmentDashboard data={data} key={dashboardKey} trialBanner={trialBanner} />;
}
