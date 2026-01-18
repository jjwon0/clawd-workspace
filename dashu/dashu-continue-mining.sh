#!/bin/bash
# Continue mining all incomplete transcripts

TRANSCRIPTS_DIR="$HOME/.astra/dashu-transcripts"
VOCAB_DIR="$HOME/.astra/dashu-vocabulary"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$VOCAB_DIR"

echo "🔍 Checking for incomplete transcripts..."

# Find all transcript files
for transcript in "$TRANSCRIPTS_DIR"/*.zh.vtt.zh.vtt; do
    [ -f "$transcript" ] || continue
    
    fileName=$(basename "$transcript")
    match=$(echo "$fileName" | sed 's/NA_\([a-zA-Z0-9_-]*\)_.*/\1/')
    videoId=${match:-unknown}
    vocabFile="$VOCAB_DIR/${videoId}.vocab.json"
    
    # Get total chunks
    sentences=$(grep -c "^[0-9]" "$transcript" 2>/dev/null || echo "0")
    totalChunks=$(( (sentences + 49) / 50 ))
    
    # Check if already done
    if [ -f "$vocabFile" ]; then
        chunksDone=$(grep -o '"chunksProcessed"' "$vocabFile" | wc -l)
        if [ "$chunksDone" -gt 0 ]; then
            chunksDone=$(grep '"chunksProcessed"' "$vocabFile" | grep -o '[0-9]*' | head -1)
            if [ "$chunksDone" -ge "$totalChunks" ]; then
                continue  # Already done
            fi
            echo "📚 $fileName"
            echo "   → ${chunksDone}/${totalChunks} chunks done, continuing..."
            cd "$SCRIPT_DIR"
            GEMINI_API_KEY="$GEMINI_API_KEY" bun run scripts/dashu-vocab-miner-simple.ts "$transcript" "$chunksDone" 2>/dev/null
        fi
    fi
done

echo "✨ Done checking!"
