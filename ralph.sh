#!/bin/bash
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <issue_number> <iterations> [branch]"
  exit 1
fi

ISSUE="$1"
ITERATIONS="$2"
BRANCH="${3:-main}"

TMPFILE=$(mktemp)
TOOLQUEUE=$(mktemp)
trap "rm -f $TMPFILE $TOOLQUEUE" EXIT

for ((i=1; i<=$ITERATIONS; i++)); do
  echo ""
  echo "╔════════════════════════════════════════╗"
  echo "║  Issue #$ISSUE - Iteration $i ($BRANCH)"
  echo "╚════════════════════════════════════════╝"
  echo ""

  # Clear tool queue
  > "$TOOLQUEUE"

  # Prepend issue number and branch to the prompt
  FULL_PROMPT="PARENT_ISSUE: $ISSUE
BRANCH: $BRANCH

$(cat PROMPT.md)"

  claude --dangerously-skip-permissions -p "$FULL_PROMPT" --output-format stream-json --verbose 2>&1 | tee "$TMPFILE" | while IFS= read -r line; do
    type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)

    case "$type" in
      assistant)
        # Print assistant text content
        content=$(echo "$line" | jq -r '.message.content[]? | select(.type=="text") | .text // empty' 2>/dev/null)
        if [ -n "$content" ]; then
          echo "$content"
        fi

        # Queue tool use (print with pending status)
        tool_info=$(echo "$line" | jq -r '.message.content[]? | select(.type=="tool_use") | "\(.id)|\(.name)|\(.input.description // .input.command // .input.path // "...")"' 2>/dev/null)
        if [ -n "$tool_info" ]; then
          tool_id=$(echo "$tool_info" | cut -d'|' -f1)
          tool_name=$(echo "$tool_info" | cut -d'|' -f2)
          tool_desc=$(echo "$tool_info" | cut -d'|' -f3- | head -c 70)
          echo "$tool_id" >> "$TOOLQUEUE"
          echo "⏳ $tool_name: $tool_desc"
        fi
        ;;
      user)
        # Tool result - find how many lines back to go
        result_tool_id=$(echo "$line" | jq -r '.message.content[]? | select(.type=="tool_result") | .tool_use_id // empty' 2>/dev/null)
        is_error=$(echo "$line" | jq -r '.message.content[]? | select(.type=="tool_result") | .is_error // false' 2>/dev/null)

        if [ -n "$result_tool_id" ]; then
          # Count lines from end of queue to find position
          total_tools=$(wc -l < "$TOOLQUEUE" | tr -d ' ')
          line_num=$(grep -n "^${result_tool_id}$" "$TOOLQUEUE" | cut -d: -f1)

          if [ -n "$line_num" ] && [ "$total_tools" -gt 0 ]; then
            lines_back=$((total_tools - line_num + 1))

            if [ "$is_error" = "true" ]; then
              # Move up, go to start, overwrite emoji
              printf "\033[%dA\r" "$lines_back"
              printf "❌"
              printf "\033[%dB\r" "$lines_back"
              # Print error on new line
              error_msg=$(echo "$line" | jq -r '.tool_use_result // empty' | tr '\n' ' ' | head -c 200)
              echo "   ↳ $error_msg"
            else
              # Move up, go to start, overwrite emoji
              printf "\033[%dA\r" "$lines_back"
              printf "✅"
              printf "\033[%dB\r" "$lines_back"
            fi

            # Remove from queue
            sed -i.bak "${line_num}d" "$TOOLQUEUE" 2>/dev/null || sed -i '' "${line_num}d" "$TOOLQUEUE"
          fi
        fi
        ;;
      result)
        echo ""
        echo "--- Result ---"
        echo "$line" | jq -r '.result // empty' 2>/dev/null
        ;;
    esac
  done

  if grep -q "<promise>COMPLETE</promise>" "$TMPFILE"; then
    echo ""
    echo "✅ Issue #$ISSUE complete after $i iterations."
    exit 0
  fi

  echo ""
  echo "--- End of iteration $i ---"
done

echo ""
echo "⚠️  Issue #$ISSUE: Reached max iterations ($ITERATIONS)"
exit 1