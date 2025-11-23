---
allowed-tools: Bash(dev/scripts/create-worktree.sh:*), Bash(dev/scripts/setup-worktree.sh:*), Bash(dev/scripts/open-terminal.sh:*), Bash(cd:*), Bash(pnpm:*)
argument-hint: <branch-name>
description: Create new worktree and setup project with dependencies
---

Create a new Git worktree for branch: $ARGUMENTS

Steps to execute:

1. Run the create-worktree script: `bash dev/scripts/create-worktree.sh $ARGUMENTS`
2. Setup the worktree with dependencies: `bash dev/scripts/setup-worktree.sh $ARGUMENTS`
3. Open terminal in the new worktree directory: `bash dev/scripts/open-terminal.sh ../org_os--worktrees/$ARGUMENTS`
4. Provide summary to user

After setup completes, tell the user:

- The worktree location: `../org_os--worktrees/$ARGUMENTS`
- Confirm that a new terminal has been opened at that location
- How to start dev server: `pnpm dev`
- Remind them they can open additional terminals at that location for parallel development workflow
