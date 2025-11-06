import { type Metadata } from "next/types";

import Workflow from "./components/workflow";
import SidebarLayout from "./layouts/sidebar-layout";

export const metadata: Metadata = {
  title: "Workflow",
  description:
    "A Next.js-based React Flow template designed to help you quickly create, manage, and visualize workflows.",
};

// Force dynamic rendering to avoid build-time static generation
export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <SidebarLayout>
      <Workflow />
    </SidebarLayout>
  );
}
