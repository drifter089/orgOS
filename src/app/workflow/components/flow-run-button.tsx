"use client";

import { Panel } from "@xyflow/react";
import { Pause, Play } from "lucide-react";

import { useWorkflowRunner } from "@/app/workflow/hooks/use-workflow-runner";
import { Button } from "@/components/ui/button";

export function FlowRunButton() {
  const { runWorkflow, stopWorkflow, isRunning } = useWorkflowRunner();

  const onClickRun = () => {
    if (isRunning) {
      stopWorkflow();
      return;
    }

    void runWorkflow();
  };

  return (
    <Panel position="top-right">
      <Button onClick={onClickRun} size="sm" className="text-xs">
        {isRunning ? (
          <>
            <Pause /> Stop Workflow
          </>
        ) : (
          <>
            <Play /> Run Workflow
          </>
        )}
      </Button>
    </Panel>
  );
}
