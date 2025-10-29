#!/bin/bash

# Script to delete a Git worktree and its directory

# Check if branch name is provided
if [ $# -eq 0 ]; then
    echo "Error: Branch name is required."
    echo "Usage: $0 <branch-name>"
    exit 1
fi

BRANCH_NAME=$1
WORKTREE_DIR="../org_os--worktrees/$BRANCH_NAME"

# Check if worktree directory exists
if [ ! -d "$WORKTREE_DIR" ]; then
    echo "Error: Worktree directory does not exist: $WORKTREE_DIR"
    exit 1
fi

# Remove the worktree from Git
echo "Removing worktree for branch '$BRANCH_NAME'"
git worktree remove "$WORKTREE_DIR"

# Check if worktree was removed successfully from Git
if [ $? -eq 0 ]; then
    echo "Worktree removed from Git successfully!"
    
    # Double-check and force remove the directory if it still exists
    if [ -d "$WORKTREE_DIR" ]; then
        echo "Directory still exists, removing it completely..."
        rm -rf "$WORKTREE_DIR"
        
        if [ $? -eq 0 ]; then
            echo "Directory removed successfully!"
        else
            echo "Warning: Failed to remove directory completely."
        fi
    fi
    
    echo "Remaining worktrees:"
    git worktree list
else
    echo "Failed to remove worktree from Git."
    echo "You may need to manually remove the directory: $WORKTREE_DIR"
    exit 1
fi