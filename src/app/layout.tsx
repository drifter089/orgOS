import { Geist, Geist_Mono } from "next/font/google";

import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import { type Metadata } from "next";

import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { NavBar } from "@/components/navbar/NavBar.server";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmationDialogProvider } from "@/providers/ConfirmationDialogProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { TransitionProvider } from "@/providers/TransitionProvider";
import "@/styles/globals.css";
import { TRPCReactProvider } from "@/trpc/react";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning className="font-sans antialiased">
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
                <FeedbackButton />
              </ConfirmationDialogProvider>
            </ThemeProvider>
          </TRPCReactProvider>
        </AuthKitProvider>
      </body>
    </html>
  );
}
