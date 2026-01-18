#!/bin/bash
# Start mining any new transcripts that haven't been mined at all

TRANSCRIPTS_DIR="$HOME/.astra/dashu-transcripts"
VOCAB_DIR="$HOME/.astra/dashu-vocabulary"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$VOCAB_DIR"

echo "🔍 Checking for new transcripts..."

# Find all transcript files
for transcript in "$TRANSCRIPTS_DIR"/*.zh.vtt.zh.vtt; do
    [ -f "$transcript" ] || continue
    
    fileName=$(basename "$transcript")
    match=$(echo "$fileName" | sed 's/NA_\([a-zA-Z0-9_-]*\)_.*/\1/')
    videoId=${match:-unknown}
    vocabFile="$VOCAB_DIR/${videoId}.vocab.json"
    
    # If no vocab file exists, start mining
    if [ ! -f "$vocabFile" ]; then
        echo "📚 New transcript: $fileName"
        echo "   → Starting mining (chunks 0-2)..."
        cd "$SCRIPT_DIR"
        GEMINI_API_KEY="$GEMINI_API_KEY" bun run scripts/dashu-vocab-miner-simple.ts "$transcript" 2>/dev/null
    fi
done

echo "✨ Done checking!"
