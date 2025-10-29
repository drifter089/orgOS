#!/bin/bash

# Script to create a new Git worktree

# Check if branch name is provided
if [ $# -eq 0 ]; then
    echo "Error: Branch name is required."
    echo "Usage: $0 <branch-name>"
    exit 1
fi

BRANCH_NAME=$1
WORKTREE_DIR="../org_os--worktrees/$BRANCH_NAME"

# Check if worktree directory already exists
if [ -d "$WORKTREE_DIR" ]; then
    echo "Error: Worktree directory already exists: $WORKTREE_DIR"
    exit 1
fi

# Create the worktree
echo "Creating worktree for branch '$BRANCH_NAME' in $WORKTREE_DIR"
echo "Starting from origin/main..."
git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" origin/main

# Check if worktree was created successfully
if [ $? -eq 0 ]; then
    echo "Worktree created successfully!"
    
    # Copy .env file to the new worktree
    echo "Copying .env file..."

    # Copy root .env
    if [ -f ".env" ]; then
        cp ".env" "$WORKTREE_DIR/.env"
        echo "Copied .env"
    else
        echo "Warning: .env not found"
    fi
    
    echo "You can navigate to it with: cd $WORKTREE_DIR"
    echo "Current worktrees:"
    git worktree list
else
    echo "Failed to create worktree."
    exit 1
fi