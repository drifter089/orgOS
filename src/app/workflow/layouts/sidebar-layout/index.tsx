import { AppSidebar } from "@/app/workflow/layouts/sidebar-layout/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex h-screen w-full flex-col overflow-hidden">
        <SidebarTrigger className="absolute z-10 mt-2 ml-2" />
        {children}
      </main>
    </SidebarProvider>
  );
}
