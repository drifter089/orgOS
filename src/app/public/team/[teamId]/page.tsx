import { notFound } from "next/navigation";

import { api } from "@/trpc/server";

import { PublicTeamCanvas } from "./_components/public-team-canvas";

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

  // Fetch team data with share token validation
  let team;
  try {
    team = await api.publicView.getTeamByShareToken({ teamId, token });
  } catch {
    // Invalid token or team not found
    notFound();
  }

  if (!team) {
    notFound();
  }

  return (
    <div className="h-screen w-full">
      <PublicTeamCanvas team={team} />
    </div>
  );
}
