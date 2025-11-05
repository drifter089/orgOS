import fs from "fs/promises";
import { compileMDX } from "next-mdx-remote/rsc";
import path from "path";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const components = {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};

export default async function RoadmapPage() {
  const roadmapPath = path.join(process.cwd(), "ROADMAP.md");
  const source = await fs.readFile(roadmapPath, "utf-8");

  const { content } = await compileMDX({
    source,
    components,
    options: {
      parseFrontmatter: true,
    },
  });

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Project Roadmap</h1>
          <p className="text-muted-foreground mt-2">
            Current progress and future development plans
          </p>
        </div>
        <a
          href="https://github.com/your-org/org_os/blob/main/ROADMAP.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          View on GitHub →
        </a>
      </div>

      <article className="prose dark:prose-invert prose-headings:scroll-m-20 prose-headings:font-bold prose-h1:text-4xl prose-h2:border-b prose-h2:pb-2 prose-h2:text-3xl prose-h3:text-2xl prose-a:text-primary prose-a:no-underline hover:prose-a:underline max-w-none">
        {content}
      </article>
    </div>
  );
}

export const metadata = {
  title: "Roadmap",
  description: "Project roadmap and future development plans",
};
