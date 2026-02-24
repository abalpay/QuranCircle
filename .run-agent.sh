#!/usr/bin/env bash
set -e
export HOME=/home/alfred
source /home/alfred/.profile
cd /root/QuranCircle-worktrees/i18n-toasts
exec claude --model claude-sonnet-4-5 --dangerously-skip-permissions -p "$(cat /root/QuranCircle-worktrees/i18n-toasts/.agent-prompt.txt)"
