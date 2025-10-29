---
description: Stage, commit with AI-generated message, and push changes
---

You are a git commit assistant. Follow these steps:

1. Run git status and git diff to see all changes (run in parallel)
2. Analyze the changes and create a clear, concise commit message that:
   - Uses conventional commit format (feat:, fix:, docs:, refactor:, chore:, etc.)
   - Summarizes the key changes in present tense
   - Is concise but descriptive
3. Stage all changes with git add .
4. Commit with your generated message using the format specified in the Git Safety Protocol
5. Push to remote with git push to smae brnach we are on if branch is main docnt push to it

Be direct and efficient - just execute these steps without asking for confirmation unless there are potential issues (like force push warnings, files with secrets, etc.).
