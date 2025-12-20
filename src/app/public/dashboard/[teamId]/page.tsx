import { notFound } from "next/navigation";

import { api } from "@/trpc/server";

import { PublicViewProvider } from "../../_context/public-view-context";
import { PublicDashboardUnified } from "./_components/public-dashboard-unified";

interface PublicDashboardPageProps {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function PublicDashboardPage({
  params,
  searchParams,
}: PublicDashboardPageProps) {
  const { teamId } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  // Fetch dashboard data with share token validation
  let dashboardData;
  try {
    dashboardData = await api.publicView.getDashboardByShareToken({
      teamId,
      token,
    });
  } catch {
    // Invalid token or team not found
    notFound();
  }

  return (
    <PublicViewProvider dashboard={dashboardData} token={token}>
      <PublicDashboardUnified />
    </PublicViewProvider>
  );
}
