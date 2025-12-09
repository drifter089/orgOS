import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Standard role colors used across the application */
export const ROLE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
] as const;

/** Convert markdown bullet points to HTML for TipTap editor */
export function markdownToHtml(text: string): string {
  if (!text) return "";

  const lines = text.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        result.push("<ul>");
        inList = true;
      }
      result.push(`<li>${trimmed.slice(2)}</li>`);
    } else if (trimmed) {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      result.push(`<p>${trimmed}</p>`);
    }
  }

  if (inList) {
    result.push("</ul>");
  }

  return result.join("");
}
