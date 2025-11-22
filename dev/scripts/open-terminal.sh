#!/bin/bash

# Script to open a new terminal window
# Usage:
#   ./open-terminal.sh                           # Open terminal in home directory
#   ./open-terminal.sh /path/to/directory        # Open terminal in specific directory
#   ./open-terminal.sh /path/to/directory "pnpm dev"  # Open terminal and run command

DIRECTORY="${1:-$HOME}"
COMMAND="${2:-}"

if [ -n "$COMMAND" ]; then
    # Open terminal in directory and run command
    nohup alacritty --working-directory "$DIRECTORY" -e bash -c "$COMMAND; exec bash" >/dev/null 2>&1 &
else
    # Just open terminal in directory
    nohup alacritty --working-directory "$DIRECTORY" >/dev/null 2>&1 &
fi

disown

echo "Opening new Alacritty terminal in: $DIRECTORY"
