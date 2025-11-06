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
- Generate ONLY the new entries to add to the \`[Unreleased]\` section
- Use keepachangelog.com format: Added, Changed, Fixed, Removed, etc.
- Be specific and user-focused
- Extract meaningful features/fixes from commit messages
- Return ONLY the new entries, NOT the full file

### 2. Update ROADMAP.md
- Identify which items need to be moved or updated
- Return specific instructions for changes (not full file)
- List items to check off as completed [x]
- List items to move from "In Progress" to "Completed"

### 3. Update CLAUDE.md
- Identify version mismatches between package.json and CLAUDE.md
- Return ONLY the changes needed (not full file)
- List specific version updates or new sections to add

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

Return a JSON object with this exact structure (return ONLY changes, not full files):

\`\`\`json
{
  "changelogEntries": {
    "added": ["New feature description"],
    "changed": ["Modified feature description"],
    "fixed": ["Bug fix description"],
    "removed": []
  },
  "roadmapUpdates": {
    "itemsToComplete": ["Item text that should be marked [x]"],
    "itemsToMove": ["Item text to move from In Progress to Completed"]
  },
  "claudeMdUpdates": {
    "versionChanges": [
      {"package": "next", "oldVersion": "15.2.3", "newVersion": "15.2.4"}
    ],
    "newSections": []
  },
  "docsUpdates": [
    {
      "file": "testing/page.md",
      "section": "## Test Patterns",
      "action": "add_after",
      "content": "### New Section\\nContent here...",
      "reason": "Added section based on new test files"
    }
  ],
  "summary": {
    "changelogEntries": 5,
    "roadmapItemsMoved": 2,
    "versionUpdates": 3,
    "docsUpdated": 1,
    "highlights": [
      "Added testing documentation for tRPC mutations"
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
    max_tokens: 16000, // Enough for incremental updates (not full files)
    temperature: 0.3, // Lower temperature for more consistent docs
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = message.choices[0].message.content;

  // Check if response was truncated
  if (message.choices[0].finish_reason === "length") {
    log("⚠️  Warning: Response was truncated due to token limit", "yellow");
    log("Consider reducing the scope or increasing max_tokens", "yellow");
  }

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

  let updates;
  try {
    updates = JSON.parse(jsonMatch[1]);
  } catch (parseError) {
    log("Error: Failed to parse JSON from Claude response", "red");
    log(`Parse error: ${parseError.message}`, "red");
    log("Response length:", "gray");
    log(`  Full response: ${responseText.length} chars`, "gray");
    log(`  JSON match: ${jsonMatch[1].length} chars`, "gray");
    log("JSON preview (last 500 chars):", "gray");
    log(jsonMatch[1].slice(-500), "gray");
    throw new Error(`JSON parse failed: ${parseError.message}`);
  }

  log("✓ Analysis complete", "green");
  log(
    `Tokens used: ${message.usage.prompt_tokens} in, ${message.usage.completion_tokens} out`,
    "gray",
  );

  return updates;
}

// Apply CHANGELOG updates
async function applyChangelogUpdates(entries) {
  const changelogPath = path.join(rootDir, "CHANGELOG.md");
  let content = await fs.readFile(changelogPath, "utf-8");

  if (!entries || Object.keys(entries).length === 0) {
    log("No changelog updates needed", "gray");
    return;
  }

  // Find the [Unreleased] section
  const unreleasedRegex = /## \[Unreleased\]([\s\S]*?)(?=\n## \[|$)/;
  const match = content.match(unreleasedRegex);

  if (!match) {
    log("⚠️  Could not find [Unreleased] section in CHANGELOG", "yellow");
    return;
  }

  let unreleasedSection = match[1];

  // Add entries for each category
  const categories = {
    added: "### Added",
    changed: "### Changed",
    fixed: "### Fixed",
    removed: "### Removed",
  };

  for (const [category, entries] of Object.entries(entries)) {
    if (!entries || entries.length === 0) continue;

    const categoryHeader = categories[category];
    const newEntries = entries.map((entry) => `- ${entry}`).join("\n");

    // Check if category section exists
    if (unreleasedSection.includes(categoryHeader)) {
      // Add to existing category
      unreleasedSection = unreleasedSection.replace(
        new RegExp(`(${categoryHeader}\\n)`),
        `$1${newEntries}\n`,
      );
    } else {
      // Add new category section
      unreleasedSection += `\n${categoryHeader}\n\n${newEntries}\n`;
    }
  }

  // Replace the unreleased section
  content = content.replace(
    unreleasedRegex,
    `## [Unreleased]${unreleasedSection}`,
  );

  await fs.writeFile(changelogPath, content, "utf-8");
  log("✓ Updated CHANGELOG.md", "green");
}

// Apply ROADMAP updates
async function applyRoadmapUpdates(updates) {
  const roadmapPath = path.join(rootDir, "ROADMAP.md");
  let content = await fs.readFile(roadmapPath, "utf-8");

  if (
    !updates ||
    ((!updates.itemsToComplete || updates.itemsToComplete.length === 0) &&
      (!updates.itemsToMove || updates.itemsToMove.length === 0))
  ) {
    log("No roadmap updates needed", "gray");
    return;
  }

  // Mark items as completed
  if (updates.itemsToComplete && updates.itemsToComplete.length > 0) {
    for (const item of updates.itemsToComplete) {
      content = content.replace(`- [ ] ${item}`, `- [x] ${item}`);
    }
  }

  // Move items from In Progress to Completed
  if (updates.itemsToMove && updates.itemsToMove.length > 0) {
    for (const item of updates.itemsToMove) {
      // Remove from In Progress (as checked item)
      const itemRegex = new RegExp(
        `- \\[x\\] ${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n`,
        "g",
      );
      content = content.replace(itemRegex, "");

      // Add to Completed section
      const completedRegex = /(### ✅ Completed[\s\S]*?)(\n###|$)/;
      content = content.replace(completedRegex, `$1- [x] ${item}\n$2`);
    }
  }

  await fs.writeFile(roadmapPath, content, "utf-8");
  log("✓ Updated ROADMAP.md", "green");
}

// Apply CLAUDE.md updates
async function applyClaudeMdUpdates(updates) {
  const claudePath = path.join(rootDir, "CLAUDE.md");
  let content = await fs.readFile(claudePath, "utf-8");

  if (
    !updates ||
    ((!updates.versionChanges || updates.versionChanges.length === 0) &&
      (!updates.newSections || updates.newSections.length === 0))
  ) {
    log("No CLAUDE.md updates needed", "gray");
    return;
  }

  // Update version numbers
  if (updates.versionChanges && updates.versionChanges.length > 0) {
    for (const change of updates.versionChanges) {
      const pattern = new RegExp(
        `(${change.package}.*?)${change.oldVersion}`,
        "gi",
      );
      content = content.replace(pattern, `$1${change.newVersion}`);
    }
  }

  // Add new sections
  if (updates.newSections && updates.newSections.length > 0) {
    for (const section of updates.newSections) {
      content += `\n\n${section}`;
    }
  }

  await fs.writeFile(claudePath, content, "utf-8");
  log("✓ Updated CLAUDE.md", "green");
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

  // Update CHANGELOG.md
  await applyChangelogUpdates(updates.changelogEntries);

  // Update ROADMAP.md
  await applyRoadmapUpdates(updates.roadmapUpdates);

  // Update CLAUDE.md
  await applyClaudeMdUpdates(updates.claudeMdUpdates);

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
