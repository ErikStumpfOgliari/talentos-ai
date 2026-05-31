import { RecruitmentDashboard } from "@/components/recruitment-dashboard";
import { requireSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireSession();
  const data = await getDashboardData();

  return <RecruitmentDashboard data={data} />;
}
