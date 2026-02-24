#!/usr/bin/env bash
# check-agents.sh — Monitor all running agents, check PRs, CI, report status
# Returns JSON summary for Alfred to act on
# Deterministic — no LLM calls, pure shell + gh CLI

set -euo pipefail

REPO_ROOT="/root/QuranCircle"
CLAWDBOT="$REPO_ROOT/.clawdbot"
TASKS_FILE="$CLAWDBOT/active-tasks.json"
REPO="abalpay/QuranCircle"
MAX_RETRIES=3

if [ ! -f "$TASKS_FILE" ] || [ "$(cat "$TASKS_FILE")" = "[]" ]; then
    echo '{"status":"idle","tasks":[],"alerts":[],"updates":[]}'
    exit 0
fi

ALERTS=()
UPDATES=()

for TASK_ID in $(jq -r '.[].id' "$TASKS_FILE"); do
    STATUS=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .status" "$TASKS_FILE")
    SESSION=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .tmuxSession" "$TASKS_FILE")
    BRANCH=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .branch" "$TASKS_FILE")
    AGENT=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .agent" "$TASKS_FILE")
    RETRIES=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .retries // 0" "$TASKS_FILE")
    DESCRIPTION=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .description" "$TASKS_FILE")

    # Skip terminal states
    if [ "$STATUS" = "done" ] || [ "$STATUS" = "failed" ] || [ "$STATUS" = "reviewed" ]; then
        continue
    fi

    # Check if tmux session is still alive
    TMUX_ALIVE=$(tmux has-session -t "$SESSION" 2>/dev/null && echo "yes" || echo "no")

    if [ "$TMUX_ALIVE" = "yes" ] && [ "$STATUS" = "running" ]; then
        # Still running — capture last few lines of output for status
        LAST_OUTPUT=$(tmux capture-pane -t "$SESSION" -p 2>/dev/null | tail -3 | tr '\n' ' ' | head -c 200 || echo "")
        UPDATES+=("{\"task\":\"$TASK_ID\",\"event\":\"still_running\",\"agent\":\"$AGENT\",\"preview\":\"$LAST_OUTPUT\"}")
        continue
    fi

    if [ "$TMUX_ALIVE" = "no" ] && [ "$STATUS" = "running" ]; then
        # Agent exited — check if it pushed and created a PR
        PR_JSON=$(gh pr list --repo "$REPO" --head "$BRANCH" --json number,url,title,state --limit 1 2>/dev/null || echo "[]")
        PR_NUMBER=$(echo "$PR_JSON" | jq -r '.[0].number // empty')
        PR_URL=$(echo "$PR_JSON" | jq -r '.[0].url // empty')
        PR_TITLE=$(echo "$PR_JSON" | jq -r '.[0].title // empty')

        if [ -n "$PR_NUMBER" ]; then
            # PR exists — check CI
            CI_CONCLUSION=""
            CI_DETAILS=""

            # Wait a moment for checks to register, then query
            CHECKS_JSON=$(gh pr checks "$PR_NUMBER" --repo "$REPO" --json name,state,conclusion 2>/dev/null || echo "[]")

            if [ "$CHECKS_JSON" = "[]" ] || [ -z "$CHECKS_JSON" ]; then
                CI_CONCLUSION="no_checks"
            else
                FAILED_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.[] | select(.conclusion=="FAILURE" or .conclusion=="failure") | .name' 2>/dev/null || echo "")
                PENDING_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.[] | select(.state=="PENDING" or .state=="IN_PROGRESS") | .name' 2>/dev/null || echo "")

                if [ -n "$PENDING_CHECKS" ]; then
                    CI_CONCLUSION="pending"
                    CI_DETAILS="$PENDING_CHECKS"
                elif [ -n "$FAILED_CHECKS" ]; then
                    CI_CONCLUSION="failed"
                    CI_DETAILS="$FAILED_CHECKS"
                else
                    CI_CONCLUSION="passed"
                fi
            fi

            case "$CI_CONCLUSION" in
                passed)
                    COMPLETED_AT=$(date +%s)000
                    TMP=$(mktemp)
                    jq "map(if .id==\"$TASK_ID\" then .status=\"ready_for_review\" | .pr=$PR_NUMBER | .prUrl=\"$PR_URL\" | .completedAt=$COMPLETED_AT else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
                    ALERTS+=("{\"task\":\"$TASK_ID\",\"event\":\"ready_for_review\",\"pr\":$PR_NUMBER,\"prUrl\":\"$PR_URL\",\"prTitle\":\"$PR_TITLE\",\"description\":\"$DESCRIPTION\"}")
                    ;;
                failed)
                    if [ "$RETRIES" -lt "$MAX_RETRIES" ]; then
                        # Get failure logs for respawn context
                        FAIL_LOG=$(gh run list --repo "$REPO" --branch "$BRANCH" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || echo "")
                        FAIL_DETAILS=""
                        if [ -n "$FAIL_LOG" ]; then
                            FAIL_DETAILS=$(gh run view "$FAIL_LOG" --repo "$REPO" --log-failed 2>/dev/null | tail -50 || echo "Check logs manually")
                        fi

                        TMP=$(mktemp)
                        jq "map(if .id==\"$TASK_ID\" then .status=\"ci_failed\" | .pr=$PR_NUMBER | .prUrl=\"$PR_URL\" else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
                        ALERTS+=("{\"task\":\"$TASK_ID\",\"event\":\"ci_failed\",\"pr\":$PR_NUMBER,\"prUrl\":\"$PR_URL\",\"failedChecks\":\"$FAILED_CHECKS\",\"retries\":$RETRIES,\"canRespawn\":true,\"failLog\":\"$(echo "$FAIL_DETAILS" | head -c 500 | tr '"' "'" | tr '\n' ' ')\"}")
                    else
                        TMP=$(mktemp)
                        jq "map(if .id==\"$TASK_ID\" then .status=\"failed\" | .pr=$PR_NUMBER | .prUrl=\"$PR_URL\" else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
                        ALERTS+=("{\"task\":\"$TASK_ID\",\"event\":\"max_retries_exhausted\",\"pr\":$PR_NUMBER,\"prUrl\":\"$PR_URL\",\"description\":\"$DESCRIPTION\"}")
                    fi
                    ;;
                pending)
                    TMP=$(mktemp)
                    jq "map(if .id==\"$TASK_ID\" then .status=\"ci_pending\" | .pr=$PR_NUMBER | .prUrl=\"$PR_URL\" else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
                    UPDATES+=("{\"task\":\"$TASK_ID\",\"event\":\"ci_pending\",\"pr\":$PR_NUMBER,\"prUrl\":\"$PR_URL\",\"pendingChecks\":\"$CI_DETAILS\"}")
                    ;;
                no_checks)
                    TMP=$(mktemp)
                    jq "map(if .id==\"$TASK_ID\" then .status=\"pr_created\" | .pr=$PR_NUMBER | .prUrl=\"$PR_URL\" else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
                    UPDATES+=("{\"task\":\"$TASK_ID\",\"event\":\"pr_created_awaiting_ci\",\"pr\":$PR_NUMBER,\"prUrl\":\"$PR_URL\"}")
                    ;;
            esac
        else
            # No PR created — check if there are at least commits on the branch
            WORKTREE="/root/QuranCircle-worktrees/$TASK_ID"
            HAS_COMMITS="no"
            if [ -d "$WORKTREE" ]; then
                COMMIT_COUNT=$(cd "$WORKTREE" && git log origin/main..HEAD --oneline 2>/dev/null | wc -l || echo "0")
                if [ "$COMMIT_COUNT" -gt 0 ]; then
                    HAS_COMMITS="yes"
                fi
            fi

            TMP=$(mktemp)
            jq "map(if .id==\"$TASK_ID\" then .status=\"finished_no_pr\" else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
            ALERTS+=("{\"task\":\"$TASK_ID\",\"event\":\"agent_finished_no_pr\",\"agent\":\"$AGENT\",\"hasCommits\":\"$HAS_COMMITS\",\"description\":\"$DESCRIPTION\"}")
        fi
    fi

    # Handle previously detected ci_pending — re-check
    if [ "$STATUS" = "ci_pending" ]; then
        PR_NUMBER=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .pr" "$TASKS_FILE")
        PR_URL=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .prUrl" "$TASKS_FILE")

        CHECKS_JSON=$(gh pr checks "$PR_NUMBER" --repo "$REPO" --json name,state,conclusion 2>/dev/null || echo "[]")
        FAILED=$(echo "$CHECKS_JSON" | jq -r '.[] | select(.conclusion=="FAILURE") | .name' 2>/dev/null || echo "")
        PENDING=$(echo "$CHECKS_JSON" | jq -r '.[] | select(.state=="PENDING" or .state=="IN_PROGRESS") | .name' 2>/dev/null || echo "")

        if [ -z "$PENDING" ] && [ -z "$FAILED" ]; then
            COMPLETED_AT=$(date +%s)000
            TMP=$(mktemp)
            jq "map(if .id==\"$TASK_ID\" then .status=\"ready_for_review\" | .completedAt=$COMPLETED_AT else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
            ALERTS+=("{\"task\":\"$TASK_ID\",\"event\":\"ready_for_review\",\"pr\":$PR_NUMBER,\"prUrl\":\"$PR_URL\",\"description\":\"$DESCRIPTION\"}")
        elif [ -n "$FAILED" ]; then
            TMP=$(mktemp)
            jq "map(if .id==\"$TASK_ID\" then .status=\"ci_failed\" else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
            ALERTS+=("{\"task\":\"$TASK_ID\",\"event\":\"ci_failed\",\"pr\":$PR_NUMBER,\"failedChecks\":\"$FAILED\",\"retries\":$RETRIES,\"canRespawn\":$([ $RETRIES -lt $MAX_RETRIES ] && echo true || echo false)}")
        fi
    fi

    # Handle pr_created — same re-check
    if [ "$STATUS" = "pr_created" ]; then
        PR_NUMBER=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .pr" "$TASKS_FILE")
        PR_URL=$(jq -r ".[] | select(.id==\"$TASK_ID\") | .prUrl" "$TASKS_FILE")

        CHECKS_JSON=$(gh pr checks "$PR_NUMBER" --repo "$REPO" --json name,state,conclusion 2>/dev/null || echo "[]")
        if [ "$CHECKS_JSON" != "[]" ] && [ -n "$CHECKS_JSON" ]; then
            FAILED=$(echo "$CHECKS_JSON" | jq -r '.[] | select(.conclusion=="FAILURE") | .name' 2>/dev/null || echo "")
            PENDING=$(echo "$CHECKS_JSON" | jq -r '.[] | select(.state=="PENDING" or .state=="IN_PROGRESS") | .name' 2>/dev/null || echo "")

            if [ -z "$PENDING" ] && [ -z "$FAILED" ]; then
                COMPLETED_AT=$(date +%s)000
                TMP=$(mktemp)
                jq "map(if .id==\"$TASK_ID\" then .status=\"ready_for_review\" | .completedAt=$COMPLETED_AT else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
                ALERTS+=("{\"task\":\"$TASK_ID\",\"event\":\"ready_for_review\",\"pr\":$PR_NUMBER,\"prUrl\":\"$PR_URL\",\"description\":\"$DESCRIPTION\"}")
            elif [ -n "$FAILED" ]; then
                TMP=$(mktemp)
                jq "map(if .id==\"$TASK_ID\" then .status=\"ci_failed\" else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
                ALERTS+=("{\"task\":\"$TASK_ID\",\"event\":\"ci_failed\",\"pr\":$PR_NUMBER,\"failedChecks\":\"$FAILED\",\"retries\":$RETRIES,\"canRespawn\":$([ $RETRIES -lt $MAX_RETRIES ] && echo true || echo false)}")
            else
                TMP=$(mktemp)
                jq "map(if .id==\"$TASK_ID\" then .status=\"ci_pending\" else . end)" "$TASKS_FILE" > "$TMP" && mv "$TMP" "$TASKS_FILE"
            fi
        fi
    fi
done

# Build output
ALERTS_JSON=$(printf '%s,' "${ALERTS[@]}" 2>/dev/null | sed 's/,$//' || echo "")
UPDATES_JSON=$(printf '%s,' "${UPDATES[@]}" 2>/dev/null | sed 's/,$//' || echo "")

echo "{\"alerts\":[${ALERTS_JSON}],\"updates\":[${UPDATES_JSON}]}"
