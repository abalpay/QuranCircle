#!/usr/bin/env bash
# cleanup-worktrees.sh — Remove worktrees for completed/failed tasks
set -euo pipefail

REPO_ROOT="/root/QuranCircle"
WORKTREE_BASE="/root/QuranCircle-worktrees"
TASKS_FILE="$REPO_ROOT/.clawdbot/active-tasks.json"

if [ ! -f "$TASKS_FILE" ]; then exit 0; fi

# Find done/failed tasks
for TASK_ID in $(jq -r '.[] | select(.status=="done" or .status=="failed") | .id' "$TASKS_FILE"); do
    WORKTREE="$WORKTREE_BASE/$TASK_ID"
    if [ -d "$WORKTREE" ]; then
        cd "$REPO_ROOT"
        git worktree remove "$WORKTREE" --force 2>/dev/null || rm -rf "$WORKTREE"
        echo "Cleaned up worktree: $TASK_ID"
    fi
done

# Remove completed tasks from registry
TMP=$(mktemp)
jq '[.[] | select(.status != "done" and .status != "failed")]' "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"

echo "Cleanup complete."
