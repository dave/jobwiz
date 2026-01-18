#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

for ((i=1; i<=$1; i++)); do
  echo ""
  echo "╔════════════════════════════════════════╗"
  echo "║  Iteration $i"
  echo "╚════════════════════════════════════════╝"
  echo ""

  claude --dangerously-skip-permissions -p "$(cat PROMPT.md)" --output-format stream-json --verbose 2>&1 | tee "$TMPFILE" | while IFS= read -r line; do
    type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)

    case "$type" in
      assistant)
        # Print assistant text content
        content=$(echo "$line" | jq -r '.message.content[]? | select(.type=="text") | .text // empty' 2>/dev/null)
        if [ -n "$content" ]; then
          echo "$content"
        fi

        # Print tool use
        tool_info=$(echo "$line" | jq -r '.message.content[]? | select(.type=="tool_use") | "\(.name)|\(.input.description // .input.command // .input.path // "running...")"' 2>/dev/null)
        if [ -n "$tool_info" ]; then
          tool_name=$(echo "$tool_info" | cut -d'|' -f1)
          tool_desc=$(echo "$tool_info" | cut -d'|' -f2-)
          echo "🔧 $tool_name: $tool_desc"
        fi
        ;;
      user)
        # Tool results - ONLY use is_error flag, don't try to guess from content
        is_error=$(echo "$line" | jq -r '.message.content[]? | select(.type=="tool_result") | .is_error // false' 2>/dev/null)
        tool_result=$(echo "$line" | jq -r '.tool_use_result // empty' 2>/dev/null)

        if [ -n "$tool_result" ]; then
          if [ "$is_error" = "true" ]; then
            # Extract readable error message
            error_msg=$(echo "$tool_result" | tr '\n' ' ' | head -c 200)
            echo "   ❌ $error_msg"
          else
            echo "   ✅ OK"
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
    echo "✅ All tasks complete after $i iterations."
    exit 0
  fi

  echo ""
  echo "--- End of iteration $i ---"
done

echo ""
echo "⚠️  Reached max iterations ($1)"
exit 1