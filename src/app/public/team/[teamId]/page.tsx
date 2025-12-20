import { notFound } from "next/navigation";

import { api } from "@/trpc/server";

import { PublicViewProvider } from "../../_context/public-view-context";
import { PublicTeamCanvasUnified } from "./_components/public-team-canvas-unified";

interface PublicTeamPageProps {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function PublicTeamPage({
  params,
  searchParams,
}: PublicTeamPageProps) {
  const { teamId } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  // Fetch team and dashboard data with share token validation
  let team;
  let dashboard;
  try {
    [team, dashboard] = await Promise.all([
      api.publicView.getTeamByShareToken({ teamId, token }),
      api.publicView.getDashboardByShareToken({ teamId, token }),
    ]);
  } catch {
    // Invalid token or team not found
    notFound();
  }

  if (!team) {
    notFound();
  }

  return (
    <PublicViewProvider team={team} dashboard={dashboard} token={token}>
      <div className="h-screen w-full">
        <PublicTeamCanvasUnified />
      </div>
    </PublicViewProvider>
  );
}
