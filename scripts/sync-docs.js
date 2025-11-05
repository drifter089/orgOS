#!/usr/bin/env node
/**
 * Documentation Sync Script
 *
 * This script synchronizes documentation files to ensure consistency across:
 * - package.json versions
 * - CLAUDE.md tech stack versions
 * - ROADMAP.md → CHANGELOG.md (completed items)
 * - Date stamps and status updates
 *
 * Usage:
 *   node scripts/sync-docs.js           # Validate and report
 *   node scripts/sync-docs.js --fix     # Validate and auto-fix
 *   node scripts/sync-docs.js --check   # Exit with error if issues (for CI)
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FILES = {
  packageJson: path.join(__dirname, "..", "package.json"),
  claudeMd: path.join(__dirname, "..", "CLAUDE.md"),
  roadmap: path.join(__dirname, "..", "ROADMAP.md"),
  changelog: path.join(__dirname, "..", "CHANGELOG.md"),
};

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes("--fix");
const shouldCheck = args.includes("--check");

// Terminal colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(60));
  log(title, "blue");
  console.log("=".repeat(60));
}

// Read files
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    log(`Error reading ${filePath}: ${error.message}`, "red");
    process.exit(1);
  }
}

function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    log(`✓ Updated ${path.basename(filePath)}`, "green");
  } catch (error) {
    log(`Error writing ${filePath}: ${error.message}`, "red");
    process.exit(1);
  }
}

// Extract version from package.json
function extractPackageVersions(content) {
  const packageJson = JSON.parse(content);
  return {
    appVersion: packageJson.version,
    dependencies: packageJson.dependencies,
    devDependencies: packageJson.devDependencies,
  };
}

// Extract versions from CLAUDE.md
function extractClaudeVersions(content) {
  const versionRegex = /- \*\*(.*?)\s+([\d.]+)\*\*/g;
  const versions = {};
  let match;

  while ((match = versionRegex.exec(content)) !== null) {
    const [, name, version] = match;
    versions[name.trim()] = version.trim();
  }

  return versions;
}

// Compare versions
function compareVersions(packageVersions, claudeVersions) {
  const discrepancies = [];

  const versionMap = {
    "Next.js": "next",
    React: "react",
    TypeScript: "typescript",
    Prisma: "@prisma/client",
    tRPC: "@trpc/server",
    "TanStack Query": "@tanstack/react-query",
    Zod: "zod",
    SuperJSON: "superjson",
    "WorkOS AuthKit": "@workos-inc/authkit-nextjs",
    "Tailwind CSS": "tailwindcss",
    "next-themes": "next-themes",
    Playwright: "@playwright/test",
    MDX: "@next/mdx",
    GSAP: "gsap",
    "react-hook-form": "react-hook-form",
    Mermaid: "mermaid",
    "react-syntax-highlighter": "react-syntax-highlighter",
  };

  for (const [claudeName, packageName] of Object.entries(versionMap)) {
    const packageVersion =
      packageVersions.dependencies?.[packageName] ||
      packageVersions.devDependencies?.[packageName];
    const claudeVersion = claudeVersions[claudeName];

    if (packageVersion && claudeVersion) {
      const cleanPackageVersion = packageVersion.replace(/^[^\d]+/, ""); // Remove ^, ~, etc.

      if (cleanPackageVersion !== claudeVersion) {
        discrepancies.push({
          name: claudeName,
          packageName,
          packageVersion: cleanPackageVersion,
          claudeVersion,
        });
      }
    }
  }

  return discrepancies;
}

// Update CLAUDE.md versions
function updateClaudeVersions(content, discrepancies) {
  let updated = content;

  for (const disc of discrepancies) {
    const oldPattern = new RegExp(
      `(- \\*\\*${disc.name}\\s+)${disc.claudeVersion}(\\*\\*)`,
    );
    const newVersion = `$1${disc.packageVersion}$2`;
    updated = updated.replace(oldPattern, newVersion);
  }

  return updated;
}

// Extract completed items from ROADMAP.md
/**
 * @param {string} roadmapContent
 * @returns {string[]}
 */
function extractCompletedItems(roadmapContent) {
  const completedSection = roadmapContent.match(
    /### ✅ Completed([\s\S]*?)(?=###|$)/,
  );
  if (!completedSection) return [];

  const items = completedSection[1].match(/- \[x\] (.*)/g) || [];
  return items.map((item) => item.replace("- [x] ", "").trim());
}

// Get recent git commits
function getRecentCommits(days = 7) {
  try {
    const since = `${days}.days.ago`;
    const commits = execSync(
      `git log --since="${since}" --pretty=format:"%s" --no-merges`,
      { encoding: "utf-8" },
    );
    return commits.split("\n").filter(Boolean);
  } catch (error) {
    log(`Warning: Could not retrieve git commits: ${error.message}`, "yellow");
    return [];
  }
}

// Validate documentation links
/**
 * @param {typeof FILES} files
 * @returns {boolean}
 */
function validateDocLinks(files) {
  log("\nValidating documentation links...", "blue");
  const docsDir = path.join(__dirname, "..", "src", "app", "docs");
  const errors = [];

  // Check if all expected docs exist
  const expectedDocs = [
    "architecture/page.md",
    "architecture/concepts/page.md",
    "architecture/concepts/server-and-client-components/page.md",
    "architecture/concepts/tanstack-query/page.md",
    "architecture/concepts/trpc-api-layer/page.md",
    "architecture/patterns/page.md",
    "testing/page.md",
    "react-flow/page.md",
    "ai-and-dev-tools/page.md",
    "ci-cd/page.md",
    "roadmap/page.tsx",
    "changelog/page.tsx",
  ];

  for (const doc of expectedDocs) {
    const docPath = path.join(docsDir, doc);
    if (!fs.existsSync(docPath)) {
      errors.push(`Missing documentation file: ${doc}`);
    }
  }

  if (errors.length > 0) {
    errors.forEach((err) => log(`✗ ${err}`, "red"));
    return false;
  }

  log("✓ All documentation files exist", "green");
  return true;
}

// Main sync function
async function syncDocumentation() {
  logSection("Documentation Sync Tool");

  log(
    `Mode: ${shouldFix ? "FIX" : shouldCheck ? "CHECK" : "VALIDATE"}`,
    "gray",
  );
  log(`Date: ${new Date().toISOString().split("T")[0]}\n`, "gray");

  let hasIssues = false;

  // Step 1: Version Sync
  logSection("1. Version Synchronization");

  const packageContent = readFile(FILES.packageJson);
  const claudeContent = readFile(FILES.claudeMd);

  const packageVersions = extractPackageVersions(packageContent);
  const claudeVersions = extractClaudeVersions(claudeContent);

  const versionDiscrepancies = compareVersions(packageVersions, claudeVersions);

  if (versionDiscrepancies.length === 0) {
    log("✓ All versions are synchronized", "green");
  } else {
    hasIssues = true;
    log(
      `Found ${versionDiscrepancies.length} version discrepancy(ies):`,
      "yellow",
    );

    versionDiscrepancies.forEach((disc) => {
      log(`  ${disc.name}:`, "yellow");
      log(`    package.json: ${disc.packageVersion}`, "gray");
      log(`    CLAUDE.md:    ${disc.claudeVersion}`, "gray");
    });

    if (shouldFix) {
      log("\nUpdating CLAUDE.md...", "blue");
      const updatedClaude = updateClaudeVersions(
        claudeContent,
        versionDiscrepancies,
      );
      writeFile(FILES.claudeMd, updatedClaude);
    }
  }

  // Step 2: Documentation Links Validation
  logSection("2. Documentation Structure");

  const linksValid = validateDocLinks(FILES);
  if (!linksValid) {
    hasIssues = true;
  }

  // Step 3: Date Stamps
  logSection("3. Date Stamps");

  const today = new Date().toISOString().split("T")[0];
  const roadmapContent = readFile(FILES.roadmap);
  const changelogContent = readFile(FILES.changelog);

  const roadmapDate = roadmapContent.match(
    /\*\*Last Updated:\*\* ([\d-]+)/,
  )?.[1];
  const changelogDate = changelogContent.match(
    /\*\*Last Updated:\*\* ([\d-]+)/,
  )?.[1];

  log(`ROADMAP.md last updated: ${roadmapDate || "Not found"}`, "gray");
  log(`CHANGELOG.md last updated: ${changelogDate || "Not found"}`, "gray");

  const roadmapNeedsUpdate = roadmapDate !== today;
  const changelogNeedsUpdate = changelogDate !== today;

  if (roadmapNeedsUpdate || changelogNeedsUpdate) {
    hasIssues = true;
    log("Date stamps need updating", "yellow");

    if (shouldFix) {
      if (roadmapNeedsUpdate) {
        const updatedRoadmap = roadmapContent.replace(
          /\*\*Last Updated:\*\* [\d-]+/,
          `**Last Updated:** ${today}`,
        );
        writeFile(FILES.roadmap, updatedRoadmap);
      }

      if (changelogNeedsUpdate) {
        const updatedChangelog = changelogContent.replace(
          /\*\*Last Updated:\*\* [\d-]+/,
          `**Last Updated:** ${today}`,
        );
        writeFile(FILES.changelog, updatedChangelog);
      }
    }
  } else {
    log("✓ Date stamps are current", "green");
  }

  // Step 4: Recent Activity
  logSection("4. Recent Activity");

  const recentCommits = getRecentCommits(7);
  if (recentCommits.length > 0) {
    log(`Found ${recentCommits.length} commits in the last 7 days:`, "gray");
    recentCommits.slice(0, 5).forEach((commit) => {
      log(`  • ${commit}`, "gray");
    });
    if (recentCommits.length > 5) {
      log(`  ... and ${recentCommits.length - 5} more`, "gray");
    }
  } else {
    log("No recent commits found", "gray");
  }

  // Summary
  logSection("Summary");

  if (hasIssues) {
    if (shouldFix) {
      log("✓ Issues have been fixed", "green");
      log("\nPlease review the changes and commit them.", "blue");
    } else {
      log("✗ Issues found. Run with --fix to auto-update.", "yellow");
    }
  } else {
    log("✓ All checks passed. Documentation is synchronized.", "green");
  }

  // Exit with appropriate code
  if (shouldCheck && hasIssues) {
    process.exit(1);
  }
}

// Run the sync
syncDocumentation().catch((error) => {
  log(`\nFatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});
