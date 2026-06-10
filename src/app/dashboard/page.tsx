import { RecruitmentDashboard } from "@/components/recruitment-dashboard";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.organization.id);

  return <RecruitmentDashboard data={data} />;
}
