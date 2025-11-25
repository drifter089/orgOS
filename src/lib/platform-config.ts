import { FileSpreadsheet } from "lucide-react";

type PlatformConfig = {
  name: string;
  logo?: string;
  useLucideIcon?: boolean;
  bgColor: string;
  textColor: string;
};

export const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  github: {
    name: "GitHub",
    logo: "https://cdn.simpleicons.org/github/FFFFFF",
    bgColor: "bg-slate-900",
    textColor: "text-white",
  },
  gitlab: {
    name: "GitLab",
    logo: "https://cdn.simpleicons.org/gitlab/FFFFFF",
    bgColor: "bg-orange-600",
    textColor: "text-white",
  },
  linear: {
    name: "Linear",
    logo: "https://cdn.simpleicons.org/linear/FFFFFF",
    bgColor: "bg-indigo-600",
    textColor: "text-white",
  },
  jira: {
    name: "Jira",
    logo: "https://cdn.simpleicons.org/jira/FFFFFF",
    bgColor: "bg-blue-600",
    textColor: "text-white",
  },
  notion: {
    name: "Notion",
    logo: "https://cdn.simpleicons.org/notion/FFFFFF",
    bgColor: "bg-black",
    textColor: "text-white",
  },
  slack: {
    name: "Slack",
    logo: "https://cdn.simpleicons.org/slack/FFFFFF",
    bgColor: "bg-purple-900",
    textColor: "text-white",
  },
  asana: {
    name: "Asana",
    logo: "https://cdn.simpleicons.org/asana/FFFFFF",
    bgColor: "bg-red-400",
    textColor: "text-white",
  },
  trello: {
    name: "Trello",
    logo: "https://cdn.simpleicons.org/trello/FFFFFF",
    bgColor: "bg-blue-500",
    textColor: "text-white",
  },
  posthog: {
    name: "PostHog",
    logo: "https://cdn.simpleicons.org/posthog/FFFFFF",
    bgColor: "bg-yellow-500",
    textColor: "text-gray-900",
  },
  youtube: {
    name: "YouTube",
    logo: "https://cdn.simpleicons.org/youtube/FFFFFF",
    bgColor: "bg-red-600",
    textColor: "text-white",
  },
  "google-sheet": {
    name: "Google Sheets",
    useLucideIcon: true,
    bgColor: "bg-green-600",
    textColor: "text-white",
  },
  "google-sheets": {
    name: "Google Sheets",
    useLucideIcon: true,
    bgColor: "bg-green-600",
    textColor: "text-white",
  },
  google: {
    name: "Google",
    logo: "https://cdn.simpleicons.org/google/FFFFFF",
    bgColor: "bg-blue-500",
    textColor: "text-white",
  },
};

export const getPlatformConfig = (id: string): PlatformConfig => {
  return (
    PLATFORM_CONFIG[id.toLowerCase()] ?? {
      name: "Unknown",
      logo: "https://cdn.simpleicons.org/internetarchive/FFFFFF",
      bgColor: "bg-gray-600",
      textColor: "text-white",
    }
  );
};

// Export FileSpreadsheet icon for consumers
export { FileSpreadsheet };
