import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";

import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import { type Metadata } from "next";

import { NavBar } from "@/components/navbar/NavBar.server";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmationDialogProvider } from "@/providers/ConfirmationDialogProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { TransitionProvider } from "@/providers/TransitionProvider";
import "@/styles/globals.css";
import { TRPCReactProvider } from "@/trpc/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
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
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
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
