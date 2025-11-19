#!/bin/bash

# Script to setup a newly created worktree
# This runs after create-worktree.sh

if [ $# -eq 0 ]; then
    echo "Error: Branch name is required."
    echo "Usage: $0 <branch-name>"
    exit 1
fi

BRANCH_NAME=$1
WORKTREE_DIR="../org_os--worktrees/$BRANCH_NAME"

# Check if worktree exists
if [ ! -d "$WORKTREE_DIR" ]; then
    echo "Error: Worktree directory does not exist: $WORKTREE_DIR"
    echo "Please run create-worktree.sh first"
    exit 1
fi

echo "Setting up worktree: $BRANCH_NAME"
echo "Location: $WORKTREE_DIR"
echo ""

# Navigate to worktree and install dependencies
cd "$WORKTREE_DIR" || exit 1

echo "Installing dependencies with pnpm..."
pnpm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "  cd $WORKTREE_DIR"
    echo "  pnpm dev              # Start development server"
    echo ""
    echo "Or open in a new terminal:"
    echo "  Open a new terminal and run: cd $(pwd)"
else
    echo "✗ Failed to install dependencies"
    exit 1
fi
