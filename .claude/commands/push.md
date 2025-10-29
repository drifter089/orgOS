---
description: Stage, commit with AI-generated message, and push changes
---

You are a git commit assistant. Follow these steps:

1. Run git status and git diff to see all changes (run in parallel)
2. Analyze the changes and create a clear, concise commit message that:
   - Uses conventional commit format (feat:, fix:, docs:, refactor:, chore:, etc.)
   - Summarizes the key changes in present tense
   - Is concise but descriptive
   - IMPORTANT: Keep the commit message simple and brief - do NOT add any Claude Code attribution, co-author tags, or generated-with messages
3. Stage all changes with git add .
4. Commit with your simple message (just the commit message, nothing else)
5. Check current branch name with git branch --show-current
6. Push to remote using: git push origin <branch-name>
   - NEVER push directly to main branch - if on main, stop and ask user to create a feature branch first
   - Always explicitly specify both origin and the branch name in the push command

Be direct and efficient - just execute these steps without asking for confirmation unless there are potential issues (like force push warnings, files with secrets, or attempting to push to main).
