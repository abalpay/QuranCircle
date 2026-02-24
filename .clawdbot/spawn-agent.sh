#!/usr/bin/env bash
# spawn-agent.sh — Create a worktree, install deps, launch an agent in tmux
# Usage: spawn-agent.sh <task-id> <branch-name> <agent: codex|claude> <prompt>
# Example: spawn-agent.sh fix-auth feat/fix-auth codex "Fix the auth redirect bug in middleware.ts"

set -euo pipefail

REPO_ROOT="/root/QuranCircle"
WORKTREE_BASE="/root/QuranCircle-worktrees"
CLAWDBOT="$REPO_ROOT/.clawdbot"
TASKS_FILE="$CLAWDBOT/active-tasks.json"
REPO_REMOTE="abalpay/QuranCircle"

TASK_ID="${1:?Usage: spawn-agent.sh <task-id> <branch> <agent> <prompt>}"
BRANCH="${2:?Missing branch name}"
AGENT="${3:?Missing agent type (codex|claude)}"
PROMPT="${4:?Missing prompt}"

mkdir -p "$WORKTREE_BASE"

# Create worktree from main
cd "$REPO_ROOT"
git fetch origin main 2>/dev/null || true
git worktree add "$WORKTREE_BASE/$TASK_ID" -b "$BRANCH" origin/main 2>/dev/null || {
    echo "Worktree or branch already exists, reusing..."
    cd "$WORKTREE_BASE/$TASK_ID"
    git checkout "$BRANCH" 2>/dev/null || true
}

WORK_DIR="$WORKTREE_BASE/$TASK_ID"
cd "$WORK_DIR"

# Install deps
if [ -f package-lock.json ]; then
    npm ci --silent 2>/dev/null || npm install --silent 2>/dev/null || true
fi

# Standard suffix appended to every agent prompt
# This ensures agents always create a PR when done
PR_INSTRUCTIONS="

IMPORTANT — When you are done with ALL changes:
1. Run 'npm run lint' and fix any lint errors
2. Run 'npm run test:unit' if unit tests exist for the changed files
3. Stage all changes: git add -A
4. Write a clear, conventional commit message: git commit -m \"feat: <description>\" (or fix:, refactor:, etc.)
5. Push the branch: git push origin $BRANCH
6. Create a pull request: gh pr create --repo $REPO_REMOTE --base main --head $BRANCH --fill
7. If the PR changes any UI, include a description of the visual changes in the PR body.

Do NOT skip the PR creation step. The task is not complete until the PR exists."

FULL_PROMPT="${PROMPT}${PR_INSTRUCTIONS}"

# Tmux session name (sanitized)
SESSION_NAME="agent-${TASK_ID}"

# Kill existing session if any
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Build the agent command
case "$AGENT" in
    codex)
        # Write prompt to a temp file to avoid shell escaping issues with long prompts
        PROMPT_FILE="$WORK_DIR/.agent-prompt.txt"
        echo "$FULL_PROMPT" > "$PROMPT_FILE"
        AGENT_CMD="codex --model o4-mini --dangerously-bypass-approvals-and-sandbox -C \"$WORK_DIR\" \"\$(cat $PROMPT_FILE)\""
        ;;
    claude)
        PROMPT_FILE="$WORK_DIR/.agent-prompt.txt"
        echo "$FULL_PROMPT" > "$PROMPT_FILE"
        # Claude Code refuses to run as root — run as 'alfred' user
        chown -R alfred:alfred "$WORK_DIR" 2>/dev/null || true
        AGENT_CMD="su - alfred -c 'cd $WORK_DIR && ANTHROPIC_API_KEY=\$(grep ANTHROPIC_API_KEY /home/alfred/.bashrc | cut -d\\\"  -f2) claude --model claude-sonnet-4-5 --dangerously-skip-permissions -p \"\$(cat $PROMPT_FILE)\"'"
        ;;
    *)
        echo "Unknown agent: $AGENT (use codex or claude)"
        exit 1
        ;;
esac

# Launch in tmux
tmux new-session -d -s "$SESSION_NAME" -c "$WORK_DIR" "bash -c '$AGENT_CMD; echo \"--- AGENT FINISHED (exit \$?) ---\"; sleep 30'"

# Register the task
STARTED_AT=$(date +%s)000
TASK_JSON=$(cat <<EOF
{
  "id": "$TASK_ID",
  "tmuxSession": "$SESSION_NAME",
  "agent": "$AGENT",
  "description": "$PROMPT",
  "repo": "QuranCircle",
  "worktree": "$TASK_ID",
  "branch": "$BRANCH",
  "startedAt": $STARTED_AT,
  "status": "running",
  "notifyOnComplete": true,
  "retries": 0
}
EOF
)

# Append to tasks file
if [ ! -f "$TASKS_FILE" ] || [ "$(cat "$TASKS_FILE")" = "[]" ]; then
    echo "[$TASK_JSON]" > "$TASKS_FILE"
else
    TMP=$(mktemp)
    jq ". += [$TASK_JSON]" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
fi

echo "✅ Agent spawned: $AGENT in tmux session '$SESSION_NAME'"
echo "   Worktree: $WORK_DIR"
echo "   Branch: $BRANCH"
echo "   Task ID: $TASK_ID"
