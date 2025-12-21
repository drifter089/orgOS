"use client";

import { Briefcase, Target, Users } from "lucide-react";

interface MemberStatsCardProps {
  roleCount: number;
  teamCount: number;
  totalEffortPoints: number;
}

export function MemberStatsCard({
  roleCount,
  teamCount,
  totalEffortPoints,
}: MemberStatsCardProps) {
  return (
    <div className="border-border/60 divide-border/60 bg-card grid h-full grid-cols-3 divide-x border">
      <StatBlock
        icon={<Briefcase className="h-4 w-4" />}
        value={roleCount}
        label={roleCount === 1 ? "Role" : "Roles"}
      />
      <StatBlock
        icon={<Users className="h-4 w-4" />}
        value={teamCount}
        label={teamCount === 1 ? "Team" : "Teams"}
      />
      <StatBlock
        icon={<Target className="h-4 w-4" />}
        value={totalEffortPoints}
        label="Points"
      />
    </div>
  );
}

function StatBlock({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="text-muted-foreground mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-muted-foreground text-xs tracking-wider uppercase">
        {label}
      </div>
    </div>
  );
}
