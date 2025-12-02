import { notFound } from "next/navigation";

import { HydrateClient, api } from "@/trpc/server";

import { PublicDashboardClient } from "./_components/public-dashboard-client";

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

  // Prefetch public data (validates token server-side)
  try {
    await api.publicView.getDashboardByShareToken.prefetch({ teamId, token });
  } catch {
    // Invalid token or team not found
    notFound();
  }

  return (
    <HydrateClient>
      <PublicDashboardClient teamId={teamId} token={token} />
    </HydrateClient>
  );
}
