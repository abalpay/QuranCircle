#!/usr/bin/env bash
# respawn-agent.sh — Respawn a failed agent with CI error context
# Usage: respawn-agent.sh <task-id> <error-context>

set -euo pipefail

REPO_ROOT="/root/QuranCircle"
WORKTREE_BASE="/root/QuranCircle-worktrees"
CLAWDBOT="$REPO_ROOT/.clawdbot"
TASKS_FILE="$CLAWDBOT/active-tasks.json"
REPO_REMOTE="abalpay/QuranCircle"

TASK_ID="${1:?Usage: respawn-agent.sh <task-id> <error-context>}"
ERROR_CONTEXT="${2:-CI failed. Please check and fix.}"

# Read task info
AGENT=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .agent" "$TASKS_FILE")
BRANCH=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .branch" "$TASKS_FILE")
ORIGINAL_PROMPT=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .description" "$TASKS_FILE")
RETRIES=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .retries // 0" "$TASKS_FILE")
PR_NUMBER=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .pr // empty" "$TASKS_FILE")

WORK_DIR="$WORKTREE_BASE/$TASK_ID"
SESSION_NAME="agent-${TASK_ID}"

# Increment retry count
NEW_RETRIES=$((RETRIES + 1))
TMP=$(mktemp)
jq "map(if .id==\"$TASK_ID\" then .retries=$NEW_RETRIES | .status=\"running\" else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"

# Build retry prompt with error context
RETRY_PROMPT="RETRY ATTEMPT $NEW_RETRIES — The previous attempt had failures.

ORIGINAL TASK: $ORIGINAL_PROMPT

CI/REVIEW FAILURE CONTEXT:
$ERROR_CONTEXT

Fix these issues. The code is already in the worktree from the previous attempt. Make targeted fixes only — don't rewrite everything.

When done: git add -A, git commit, git push origin $BRANCH (force push is OK), and the existing PR #${PR_NUMBER:-unknown} will update automatically."

cd "$WORK_DIR"

# Kill existing session
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Write prompt to file
PROMPT_FILE="$WORK_DIR/.agent-prompt.txt"
echo "$RETRY_PROMPT" > "$PROMPT_FILE"

case "$AGENT" in
    codex)
        AGENT_CMD="codex --model o4-mini --dangerously-bypass-approvals-and-sandbox -C \"$WORK_DIR\" \"\$(cat $PROMPT_FILE)\""
        ;;
    claude)
        AGENT_CMD="claude --model claude-sonnet-4-5 --dangerously-skip-permissions -p \"\$(cat $PROMPT_FILE)\""
        ;;
esac

tmux new-session -d -s "$SESSION_NAME" -c "$WORK_DIR" "bash -c '$AGENT_CMD; echo \"--- AGENT FINISHED (exit \$?) ---\"; sleep 30'"

echo "🔄 Respawned agent: $AGENT (retry $NEW_RETRIES) in tmux session '$SESSION_NAME'"
