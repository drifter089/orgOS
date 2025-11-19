import { Geist } from "next/font/google";

import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import { type Metadata } from "next";

import { NavBar } from "@/components/navbar/NavBar.server";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmationDialogProvider } from "@/providers/ConfirmationDialogProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { TransitionProvider } from "@/providers/TransitionProvider";
import "@/styles/globals.css";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: {
    default: "ORG-OS",
    template: "%s | ORG-OS",
  },
  description:
    "Your organizational operating system - Streamline team management, workflows, and collaboration",
  keywords: [
    "organization",
    "team management",
    "workflow",
    "collaboration",
    "productivity",
  ],
  authors: [{ name: "ORG-OS Team" }],
  creator: "ORG-OS",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://github.com/drifter089/orgOS",
    title: "ORG-OS",
    description: "Your organizational operating system",
    siteName: "ORG-OS",
  },
  twitter: {
    card: "summary_large_image",
    title: "ORG-OS",
    description: "Your organizational operating system",
  },
  icons: [
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "icon", url: "/favicon.ico", sizes: "any" },
  ],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthKitProvider>
          <TRPCReactProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ConfirmationDialogProvider>
                <NavBar />
                <TransitionProvider>{children}</TransitionProvider>
                <Toaster />
              </ConfirmationDialogProvider>
            </ThemeProvider>
          </TRPCReactProvider>
        </AuthKitProvider>
      </body>
    </html>
  );
}
