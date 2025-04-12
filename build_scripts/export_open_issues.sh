#!/bin/bash

REPOSITORY="ezra-bible-app/ezra-bible-app"
OUTPUT_FILE="open_issues.json"

# Execute the command with pagination to fetch all issues
gh issue list --repo "$REPOSITORY" --json number,title,url,body --limit 200 > "$OUTPUT_FILE"

echo "Exported open issues to $OUTPUT_FILE"
