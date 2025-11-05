#!/usr/bin/env node
/**
 * AI-Powered Documentation Sync
 *
 * Uses Claude AI to intelligently update documentation based on recent code changes.
 * This script analyzes git commits, updates project files, and generates documentation
 * updates similar to the docs-writer agent.
 *
 * Features:
 * - CHANGELOG.md generation from commits
 * - ROADMAP.md progress tracking
 * - CLAUDE.md tech stack synchronization
 * - Documentation page updates based on code changes
 * - Mermaid diagrams and code examples
 *
 * Usage:
 *   node scripts/ai-sync-docs.js           # Run sync and show changes
 *   OPENROUTER_API_KEY=key node scripts/ai-sync-docs.js
 */
import { execSync } from "child_process";
import * as fs from "fs/promises";
import { glob } from "glob";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// Terminal colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(70));
  log(title, "blue");
  console.log("=".repeat(70));
}

// Initialize OpenRouter client (uses OpenAI SDK)
function createAnthropicClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    log("Error: OPENROUTER_API_KEY environment variable not set", "red");
    log("Set it with: export OPENROUTER_API_KEY=your-key-here", "yellow");
    process.exit(1);
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
  });
}

// Get recent git activity
function getRecentCommits(days = 7) {
  try {
    const commits = execSync(
      `git log --since="${days} days ago" --pretty=format:"%h - %s (%an, %ar)" --no-merges`,
      { encoding: "utf-8", cwd: rootDir },
    );
    return commits || "No recent commits";
  } catch (error) {
    return "Unable to retrieve commits";
  }
}

function getChangedFiles(days = 7) {
  try {
    const diff = execSync(
      `git diff --stat HEAD~${Math.min(days * 3, 20)}..HEAD 2>/dev/null || git diff --stat`,
      { encoding: "utf-8", cwd: rootDir },
    );
    return diff || "No file changes detected";
  } catch (error) {
    return "Unable to retrieve file changes";
  }
}

function getRecentPRs() {
  try {
    const prs = execSync(
      `gh pr list --state merged --limit 10 --json number,title,mergedAt,author 2>/dev/null || echo "[]"`,
      { encoding: "utf-8", cwd: rootDir },
    );
    return JSON.parse(prs);
  } catch (error) {
    return [];
  }
}

// Read current documentation files
async function readProjectFiles() {
  const files = {
    roadmap: await fs.readFile(path.join(rootDir, "ROADMAP.md"), "utf-8"),
    changelog: await fs.readFile(path.join(rootDir, "CHANGELOG.md"), "utf-8"),
    claudeMd: await fs.readFile(path.join(rootDir, "CLAUDE.md"), "utf-8"),
    packageJson: await fs.readFile(path.join(rootDir, "package.json"), "utf-8"),
  };

  // Get all doc pages
  const docsDir = path.join(rootDir, "src/app/docs");
  const docFiles = await glob("**/*.{md,mdx}", {
    cwd: docsDir,
    ignore: ["**/node_modules/**"],
  });

  files.docs = {};
  for (const docFile of docFiles) {
    const fullPath = path.join(docsDir, docFile);
    files.docs[docFile] = await fs.readFile(fullPath, "utf-8");
  }

  return files;
}

// Analyze and update with Claude AI
async function analyzeWithClaude(files, commits, changedFiles, prs) {
  logSection("🤖 Analyzing with Claude AI");

  const anthropic = createAnthropicClient();

  const prompt = `You are an expert technical documentation writer and maintainer. You will analyze recent project activity and update documentation intelligently.

## Context: T3 Stack Project

This is a Next.js 15 application using:
- **tRPC** for type-safe APIs
- **Prisma** with PostgreSQL
- **WorkOS AuthKit** for authentication
- **TanStack Query** for data fetching
- **Tailwind CSS** with shadcn/ui components
- **MDX** for documentation with Mermaid diagram support

Documentation is located in \`src/app/docs/\` with the following structure:
${Object.keys(files.docs)
  .map((f) => `- ${f}`)
  .join("\n")}

## Recent Activity (Last 7 Days)

### Git Commits:
\`\`\`
${commits}
\`\`\`

### Changed Files:
\`\`\`
${changedFiles}
\`\`\`

${
  prs.length > 0
    ? `### Recent Merged PRs:
${prs.map((pr) => `- #${pr.number}: ${pr.title} (by ${pr.author.login})`).join("\n")}
`
    : ""
}

## Current Project Files

### ROADMAP.md
\`\`\`markdown
${files.roadmap}
\`\`\`

### CHANGELOG.md
\`\`\`markdown
${files.changelog}
\`\`\`

### CLAUDE.md
\`\`\`markdown
${files.claudeMd}
\`\`\`

### package.json (for version reference)
\`\`\`json
${files.packageJson}
\`\`\`

## Current Documentation Pages

${Object.entries(files.docs)
  .map(
    ([filename, content]) => `
### ${filename}
\`\`\`markdown
${content.slice(0, 1500)}${content.length > 1500 ? "\n... (truncated)" : ""}
\`\`\`
`,
  )
  .join("\n")}

## Your Tasks

Please analyze the commits and changed files to update the following:

### 1. Update CHANGELOG.md
- Add entries to the \`[Unreleased]\` section based on recent commits
- Use keepachangelog.com format: Added, Changed, Fixed, Removed, etc.
- Be specific and user-focused
- Extract meaningful features/fixes from commit messages

### 2. Update ROADMAP.md
- Move completed items from "In Progress" to "Completed" section
- Update progress percentages based on actual work done
- Check off completed tasks with [x]
- Add new items if commits reveal new planned work

### 3. Update CLAUDE.md
- Sync all version numbers from package.json dependencies
- Update tech stack if new major dependencies were added
- Add architectural notes if significant patterns emerged
- Update development commands if scripts changed

### 4. Update Documentation Pages (Like docs-writer agent)
**This is critical**: Identify which documentation pages need updates based on code changes:

- If testing files changed → update \`testing/page.md\`
- If tRPC routers changed → update \`architecture/concepts/trpc-api-layer/page.md\`
- If React components changed → update relevant architecture docs
- If CI/CD config changed → update \`ci-cd/page.md\`
- If new libraries added → update relevant integration docs

For each documentation update:
- **Work incrementally** - update specific sections, don't rewrite entire pages
- Add Mermaid diagrams where they help explain concepts
- Include practical code examples from the actual codebase
- Add best practices and common pitfalls
- Maintain consistency with existing documentation tone
- Use proper MDX formatting with syntax highlighting

### Example Documentation Update Format:

If you update a doc page, specify the exact section and content:

\`\`\`
FILE: testing/page.md
SECTION: Add after "## Test Patterns"
CONTENT:
### Testing tRPC Mutations

When testing tRPC mutations, ensure you properly handle optimistic updates...

\`\`\`mermaid
sequenceDiagram
    participant Test
    participant tRPC
    participant DB
    ...
\`\`\`
\`\`\`

## Response Format

Return a JSON object with this exact structure:

\`\`\`json
{
  "changelog": "full updated CHANGELOG.md content",
  "roadmap": "full updated ROADMAP.md content",
  "claudeMd": "full updated CLAUDE.md content",
  "docsUpdates": [
    {
      "file": "testing/page.md",
      "section": "## Test Patterns",
      "action": "add_after",
      "content": "### New Section\\nContent here...",
      "reason": "Added section on testing tRPC mutations based on new test files"
    }
  ],
  "summary": {
    "changelogEntries": 5,
    "roadmapItemsMoved": 2,
    "versionUpdates": 3,
    "docsUpdated": 1,
    "highlights": [
      "Added testing documentation for tRPC mutations",
      "Moved 2 completed items to changelog"
    ]
  }
}
\`\`\`

**Important**:
- Only update docs if there are meaningful code changes that warrant documentation updates
- If no documentation changes needed, return empty \`docsUpdates\` array
- Be conservative - don't make up documentation for code that wasn't changed
- Focus on keeping documentation in sync with actual implementation
`;

  log("Sending request to OpenRouter (Claude Sonnet 4.5)...", "gray");
  log(`Model: anthropic/claude-sonnet-4.5`, "gray");

  const message = await anthropic.chat.completions.create({
    model: "anthropic/claude-sonnet-4.5",
    max_tokens: 16000,
    temperature: 0.3, // Lower temperature for more consistent docs
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = message.choices[0].message.content;

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch =
    responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
    responseText.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    log("Error: Could not parse Claude response", "red");
    log("Response preview:", "gray");
    log(responseText.slice(0, 500), "gray");
    throw new Error("Invalid response format from Claude");
  }

  const updates = JSON.parse(jsonMatch[1]);

  log("✓ Analysis complete", "green");
  log(
    `Tokens used: ${message.usage.prompt_tokens} in, ${message.usage.completion_tokens} out`,
    "gray",
  );

  return updates;
}

// Apply documentation updates
async function applyDocsUpdates(docsUpdates) {
  if (!docsUpdates || docsUpdates.length === 0) {
    log("No documentation updates needed", "gray");
    return;
  }

  logSection("📝 Applying Documentation Updates");

  for (const update of docsUpdates) {
    const filePath = path.join(rootDir, "src/app/docs", update.file);

    try {
      let content = await fs.readFile(filePath, "utf-8");

      log(`\nUpdating: ${update.file}`, "cyan");
      log(`  Reason: ${update.reason}`, "gray");
      log(`  Action: ${update.action} "${update.section}"`, "gray");

      if (update.action === "add_after") {
        // Find the section and add content after it
        const sectionRegex = new RegExp(
          `(${update.section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*?)(\n##|\n$)`,
          "s",
        );
        const match = content.match(sectionRegex);

        if (match) {
          content = content.replace(
            sectionRegex,
            `${match[1]}\n\n${update.content}${match[2]}`,
          );
        } else {
          // Section not found, append to end
          log(
            `  Warning: Section "${update.section}" not found, appending to end`,
            "yellow",
          );
          content += `\n\n${update.content}`;
        }
      } else if (update.action === "replace") {
        // Replace entire section
        const sectionRegex = new RegExp(
          `${update.section}.*?(?=\n##|\n$)`,
          "s",
        );
        content = content.replace(sectionRegex, update.content);
      } else if (update.action === "append") {
        // Append to end of file
        content += `\n\n${update.content}`;
      }

      await fs.writeFile(filePath, content, "utf-8");
      log(`  ✓ Updated successfully`, "green");
    } catch (error) {
      log(`  ✗ Error updating ${update.file}: ${error.message}`, "red");
    }
  }
}

// Main sync function
async function main() {
  logSection("🤖 AI-Powered Documentation Sync");
  log(`Date: ${new Date().toISOString().split("T")[0]}`, "gray");
  log(`Mode: Full AI Sync (CHANGELOG + ROADMAP + CLAUDE.md + Docs)\n`, "gray");

  // Gather information
  log("Gathering project information...", "cyan");
  const commits = getRecentCommits(7);
  const changedFiles = getChangedFiles(7);
  const prs = getRecentPRs();
  const files = await readProjectFiles();

  log("✓ Project information collected", "green");
  log(`  - ${commits.split("\n").length} commits`, "gray");
  log(`  - ${changedFiles.split("\n").length} changed files`, "gray");
  log(`  - ${prs.length} merged PRs`, "gray");
  log(`  - ${Object.keys(files.docs).length} documentation pages`, "gray");

  // Analyze with Claude
  const updates = await analyzeWithClaude(files, commits, changedFiles, prs);

  // Apply updates
  logSection("💾 Writing Updates");

  await fs.writeFile(
    path.join(rootDir, "CHANGELOG.md"),
    updates.changelog,
    "utf-8",
  );
  log("✓ Updated CHANGELOG.md", "green");

  await fs.writeFile(
    path.join(rootDir, "ROADMAP.md"),
    updates.roadmap,
    "utf-8",
  );
  log("✓ Updated ROADMAP.md", "green");

  await fs.writeFile(
    path.join(rootDir, "CLAUDE.md"),
    updates.claudeMd,
    "utf-8",
  );
  log("✓ Updated CLAUDE.md", "green");

  // Apply documentation updates
  await applyDocsUpdates(updates.docsUpdates);

  // Summary
  logSection("📊 Summary");
  log(JSON.stringify(updates.summary, null, 2), "cyan");

  if (updates.summary.highlights && updates.summary.highlights.length > 0) {
    log("\n🎯 Highlights:", "blue");
    updates.summary.highlights.forEach((h) => log(`  • ${h}`, "gray"));
  }

  log("\n✅ AI documentation sync complete!", "green");
  log("\nNext steps:", "yellow");
  log("  1. Review the changes with: git diff", "gray");
  log("  2. Test the documentation locally", "gray");
  log("  3. Commit and push, or let CI create a PR", "gray");
}

// Run the sync
try {
  main();
} catch (error) {
  log(`\n❌ Fatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
}
