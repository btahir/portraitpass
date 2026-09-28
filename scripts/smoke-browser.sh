#!/usr/bin/env bash
set -e
export AGENT_BROWSER_SESSION=portraitpass-smoke
export AGENT_BROWSER_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
trap 'agent-browser close >/dev/null 2>&1 || true' EXIT
agent-browser --headed false open http://127.0.0.1:4319
agent-browser wait --load networkidle
agent-browser screenshot notes/first-screen.png
agent-browser snapshot -i
agent-browser errors
