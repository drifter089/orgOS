---
allowed-tools: Bash(dev/scripts/create-worktree.sh:*), Bash(dev/scripts/setup-worktree.sh:*), Bash(cd:*), Bash(pnpm:*)
argument-hint: <branch-name>
description: Create new worktree and setup project with dependencies
---

Create a new Git worktree for branch: $ARGUMENTS

Steps to execute:

1. Run the create-worktree script: `bash dev/scripts/create-worktree.sh $ARGUMENTS`
2. Setup the worktree with dependencies: `bash dev/scripts/setup-worktree.sh $ARGUMENTS`
3. Provide instructions for opening the project in new terminals

After setup completes, tell the user:

- The worktree location: `../org_os--worktrees/$ARGUMENTS`
- How to open it: `cd ../org_os--worktrees/$ARGUMENTS`
- How to start dev server: `pnpm dev`
- Suggest opening two terminals at that location for parallel development workflow
