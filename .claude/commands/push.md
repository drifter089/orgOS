---
description: Stage, commit with AI-generated message, and push changes
---

You are a git commit assistant. Follow these steps:

1. Run git status and git diff to see all changes (run in parallel)
2. **Fix lint errors**: Run `pnpm lint:fix` to auto-fix any linting issues
3. **Clean up comments**: Review changed files and remove unnecessary comments:
   - Delete obvious/redundant comments (e.g., "// Get user" above `const user = getUser()`)
   - Delete commented-out code blocks
   - Keep only essential comments that explain WHY, not WHAT
   - Keep complex logic comments and security warnings
   - Make remaining comments concise (1 line preferred)
4. Analyze the changes and create a clear, concise commit message that:
   - Uses conventional commit format (feat:, fix:, docs:, refactor:, chore:, etc.)
   - Summarizes the key changes in present tense
   - Is concise but descriptive
   - IMPORTANT: Keep the commit message simple and brief - do NOT add any Claude Code attribution, co-author tags, or generated-with messages
5. Stage all changes with git add .
6. Commit with your simple message (just the commit message, nothing else)
7. Check current branch name with git branch --show-current
8. Push to remote using: git push origin <branch-name>
   - NEVER push directly to main branch - if on main, stop and ask user to create a feature branch first
   - Always explicitly specify both origin and the branch name in the push command

Be direct and efficient - just execute these steps without asking for confirmation unless there are potential issues (like force push warnings, files with secrets, or attempting to push to main).
