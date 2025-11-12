#!/bin/bash

# Script to list all Nango connections

echo "📡 Fetching Nango connections..."
echo ""

# Check if NANGO_SECRET_KEY_DEV is set
if [ -z "$NANGO_SECRET_KEY_DEV" ]; then
  echo "❌ Error: NANGO_SECRET_KEY_DEV not set"
  echo "💡 Run: export NANGO_SECRET_KEY_DEV='your-key-here'"
  exit 1
fi

# Fetch connections from Nango API
response=$(curl -s https://api.nango.dev/connection \
  -H "Authorization: Bearer $NANGO_SECRET_KEY_DEV")

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Raw response:"
  echo "$response"
  echo ""
  echo "💡 Install jq for prettier output: brew install jq (Mac) or apt install jq (Linux)"
else
  # Pretty print with jq
  echo "$response" | jq -r '.connections[] | "🔗 \(.provider_config_key) - \(.connection_id) [\(.status)]"'
fi

echo ""
echo "✅ Done! Use these connection IDs for testing:"
echo "   npx nango dryrun <sync-name> <connection-id>"
