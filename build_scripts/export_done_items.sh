#!/bin/bash

# Check if a project number is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <project-number>"
  exit 1
fi

PROJECT_NUMBER=$1
OUTPUT_FILE="done_items.json"

# Execute the command
gh project item-list "$PROJECT_NUMBER" --owner ezra-bible-app --format json | jq '.[] | select(.[]?.status == "Done")' > "$OUTPUT_FILE"

echo "Exported done items to $OUTPUT_FILE"
