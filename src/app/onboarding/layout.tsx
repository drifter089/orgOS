import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Set up your organization in ryō",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-background min-h-screen">{children}</div>;
}
