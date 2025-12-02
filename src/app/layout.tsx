import {
  Alegreya_SC,
  Fira_Code,
  Fraunces,
  Inter,
  Montserrat,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";

import { Analytics } from "@vercel/analytics/next";
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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const alegreyaSC = Alegreya_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-alegreya-sc",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
});

export const metadata: Metadata = {
  title: {
    default: "Ryo",
    template: "%s | Ryo",
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
  authors: [{ name: "Ryo Team" }],
  creator: "Ryo",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://github.com/drifter089/ryo",
    title: "Ryo",
    description: "Your organizational operating system",
    siteName: "Ryo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ryo",
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
      className={`${spaceGrotesk.variable} ${fraunces.variable} ${spaceMono.variable} ${montserrat.variable} ${inter.variable} ${alegreyaSC.variable} ${firaCode.variable}`}
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
                <FeedbackButton />
                <Analytics />
              </ConfirmationDialogProvider>
            </ThemeProvider>
          </TRPCReactProvider>
        </AuthKitProvider>
      </body>
    </html>
  );
}
