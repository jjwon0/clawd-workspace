#!/bin/bash
# Download Dashu Mandarin podcast transcripts and mine vocabulary

TRANSCRIPTS_DIR="$HOME/.astra/dashu-transcripts"
VOCAB_DIR="$HOME/.astra/dashu-vocabulary"
CHANNEL_URL="https://www.youtube.com/@dashumandarin/videos"
SEEN_FILE="$TRANSCRIPTS_DIR/.seen_videos"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create directories if needed
mkdir -p "$TRANSCRIPTS_DIR"
mkdir -p "$VOCAB_DIR"

# Create seen file if it doesn't exist
touch "$SEEN_FILE"

# Get list of recent videos
echo "Fetching recent videos from Dashu Mandarin..."
yt-dlp --flat-playlist "$CHANNEL_URL" --print "%(upload_date)s %(id)s %(title)s" 2>/dev/null | while read -r date id title; do
    # Check if already seen
    if grep -q "$id" "$SEEN_FILE" 2>/dev/null; then
        continue
    fi

    echo "⬇️  Downloading: $title"
    OUTPUT_FILE="$TRANSCRIPTS_DIR/${date}_${id}_${title}.zh.vtt"

    # Download Chinese subtitles
    yt-dlp --write-subs --sub-langs "zh" --skip-download "https://www.youtube.com/watch?v=$id" --output "$OUTPUT_FILE" 2>/dev/null

    if [ -f "${OUTPUT_FILE%.*}.zh.vtt" ]; then
        echo "  → Saved transcript: $(basename "${OUTPUT_FILE%.*}.zh.vtt")"
        echo "$id" >> "$SEEN_FILE"
        
        # Mine vocabulary from the new transcript
        echo "⛏️  Mining vocabulary..."
        cd "$SCRIPT_DIR"
        GEMINI_API_KEY="$GEMINI_API_KEY" bun run scripts/dashu-vocab-miner-simple.ts "${OUTPUT_FILE%.*}.zh.vtt" 2>/dev/null
        
        if [ -f "$VOCAB_DIR/${id}.vocab.json" ]; then
            echo "  → Saved vocabulary: ${id}.vocab.json"
        fi
    else
        echo "  → Failed to download subtitles"
    fi
done

echo ""
echo "📁 Transcripts: $TRANSCRIPTS_DIR"
echo "📚 Vocabulary: $VOCAB_DIR"
echo "Done!"
