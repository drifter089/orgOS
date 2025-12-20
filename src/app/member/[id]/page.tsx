import { notFound } from "next/navigation";

import { HydrateClient, api } from "@/trpc/server";

import { MemberPageClient } from "./_components/member-page-client";

interface MemberPageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberPage({ params }: MemberPageProps) {
  const { id: memberId } = await params;

  const [members] = await Promise.all([
    api.organization.getMembers().catch(() => []),
    api.role.getByUser.prefetch({ userId: memberId }),
    api.dashboard.getDashboardCharts.prefetch(),
  ]);

  const member = members.find((m) => m.id === memberId);
  if (!member) {
    notFound();
  }

  return (
    <HydrateClient>
      <MemberPageClient memberId={memberId} memberInfo={member} />
    </HydrateClient>
  );
}
