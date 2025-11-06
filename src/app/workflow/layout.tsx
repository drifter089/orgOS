import { ReactFlowProvider } from "@xyflow/react";

import { loadData } from "./mock-data";
import { AppStoreProvider } from "./store";

export default async function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Load data on server during render
  const { nodes, edges } = await loadData();

  return (
    <AppStoreProvider initialState={{ nodes, edges }}>
      <ReactFlowProvider initialNodes={nodes} initialEdges={edges}>
        {children}
      </ReactFlowProvider>
    </AppStoreProvider>
  );
}
