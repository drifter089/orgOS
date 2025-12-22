"use client";

import { ArrowLeft, Check, Target } from "lucide-react";

import { GoalEditor } from "@/components/metric/goal-editor";
import { RoleAssignment } from "@/components/metric/role-assignment";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface GoalSetupStepProps {
  metricId: string;
  metricName: string;
  teamId?: string;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
  useDialogHeader?: boolean;
}

export function GoalSetupStep({
  metricId,
  metricName,
  teamId,
  onBack,
  onSkip,
  onFinish,
  useDialogHeader = false,
}: GoalSetupStepProps) {
  const header = useDialogHeader ? (
    <DialogHeader>
      <div className="flex items-center gap-2">
        <Target className="text-primary h-5 w-5" />
        <DialogTitle>Set a Goal (Optional)</DialogTitle>
      </div>
      <DialogDescription>
        Add a goal to track progress for <strong>{metricName}</strong>. You can
        skip this and add a goal later from the dashboard.
      </DialogDescription>
    </DialogHeader>
  ) : (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Target className="text-primary h-5 w-5" />
        <h3 className="text-lg font-semibold">Set a Goal (Optional)</h3>
      </div>
      <p className="text-muted-foreground text-sm">
        Add a goal to track progress for <strong>{metricName}</strong>. You can
        skip this and add a goal later from the dashboard.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {header}

      <div className="space-y-4 py-2">
        <GoalEditor
          metricId={metricId}
          initialGoal={null}
          startEditing={true}
          compact={true}
          onSave={onFinish}
        />

        {teamId && (
          <>
            <Separator />
            <RoleAssignment
              metricId={metricId}
              metricName={metricName}
              teamId={teamId}
              assignedRoleIds={[]}
            />
          </>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSkip}>
            Skip
          </Button>
          <Button size="sm" onClick={onFinish} className="gap-1.5">
            <Check className="h-4 w-4" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
