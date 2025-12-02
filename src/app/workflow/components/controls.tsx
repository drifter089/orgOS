import { Panel } from "@xyflow/react";
import { Route } from "lucide-react";

import { useLayout } from "@/app/workflow/hooks/use-layout";
import { ZoomSlider } from "@/components/react-flow";
import { Button } from "@/components/ui/button";

export function WorkflowControls() {
  const runLayout = useLayout();

  return (
    <>
      <ZoomSlider position="bottom-left" className="bg-card" />
      <Panel
        position="bottom-right"
        className="bg-card text-foreground rounded-md"
      >
        <Button onClick={runLayout} variant="ghost">
          <Route />
        </Button>
      </Panel>
    </>
  );
}
