---
allowed-tools: Bash(dev/scripts/create-worktree.sh:*), Bash(dev/scripts/setup-worktree.sh:*), Bash(dev/scripts/open-terminal.sh:*), Bash(cd:*), Bash(pnpm:*), Bash(shuf:*), Bash(git worktree list:*)
description: Create new worktree and setup project with dependencies (project)
---

Create 3 new Git worktrees with creative random names and open terminals with Claude.

## Name Pool (pick 3 random names not already in use)

Sci-Fi Characters: wt-spock, wt-ripley, wt-deckard, wt-neo, wt-morpheus, wt-trinity, wt-yoda, wt-obiwan, wt-leia, wt-solo, wt-data, wt-picard, wt-worf, wt-seven, wt-janeway

Scientists: wt-curie, wt-tesla, wt-faraday, wt-planck, wt-fermi, wt-kepler, wt-galileo, wt-darwin, wt-newton, wt-einstein, wt-hawking, wt-feynman, wt-bohr, wt-dirac, wt-lovelace

Chess Players: wt-magnus, wt-kasparov, wt-fischer, wt-capablanca, wt-tal, wt-karpov, wt-anand, wt-carlsen, wt-morphy, wt-alekhine, wt-botvinnik, wt-spassky, wt-petrosian, wt-smyslov

Robots/AI: wt-hal9000, wt-r2d2, wt-c3po, wt-bishop, wt-ash, wt-david, wt-ava, wt-samantha, wt-jarvis, wt-ultron, wt-vision, wt-cortana, wt-glados, wt-shodan

## Steps to execute:

1. First, check existing worktrees: `git worktree list`

2. Pick 3 random names from the pools above that are NOT already in use as worktree branches

3. For each of the 3 names, run:
   - Create worktree: `bash dev/scripts/create-worktree.sh <name>`
   - Setup dependencies: `bash dev/scripts/setup-worktree.sh <name>`

4. After ALL worktrees are created and setup, open terminals with Claude running:
   - `bash dev/scripts/open-terminal.sh ../org_os--worktrees/<name1> "ai"`
   - `bash dev/scripts/open-terminal.sh ../org_os--worktrees/<name2> "ai"`
   - `bash dev/scripts/open-terminal.sh ../org_os--worktrees/<name3> "ai"`

5. Provide summary to user with:
   - List of 3 worktree locations created
   - Confirm terminals are open with Claude running
   - Remind them `pnpm dev` to start dev server in each
