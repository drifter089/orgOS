import { HydrateClient, api } from "@/trpc/server";

import { CheckInClient } from "./_components/check-in-client";

interface CheckInPageProps {
  params: Promise<{ userId: string }>;
}

export default async function CheckInPage({ params }: CheckInPageProps) {
  const { userId } = await params;

  // Prefetch the user's manual metrics
  await api.manualMetric.getForUser.prefetch({ userId });

  return (
    <HydrateClient>
      <div className="container mx-auto max-w-4xl py-8">
        <CheckInClient userId={userId} />
      </div>
    </HydrateClient>
  );
}
