# Chinese Vocabulary Miner

Extract vocabulary from Chinese transcripts (VTT format) using AI.

## Commands

```bash
# Process first 3 chunks (default)
bun run scripts/dashu-vocab-miner-simple.ts <transcript>

# Process specific chunks
bun run scripts/dashu-vocab-miner-simple.ts <transcript> <start_chunk> <num_chunks>

# Check processing status
bun run scripts/dashu-vocab-miner-simple.ts --status <transcript>

# Continue from last chunk
bun run scripts/dashu-vocab-miner-simple.ts --continue <transcript>
```

## Examples

```bash
# Check a video's status
bun run scripts/dashu-vocab-miner-simple.ts --status ~/.clawd/dashu-transcripts/NA_videoId_title.zh.vtt.zh.vtt

# Start mining a new video
bun run scripts/dashu-vocab-miner-simple.ts ~/.clawd/dashu-transcripts/NA_videoId_title.zh.vtt.zh.vtt

# Continue from where you left off
bun run scripts/dashu-vocab-miner-simple.ts --continue ~/.clawd/dashu-transcripts/NA_videoId_title.zh.vtt.zh.vtt

# Process one chunk at a time
bun run scripts/dashu-vocab-miner-simple.ts ~/.clawd/dashu-transcripts/NA_videoId_title.zh.vtt.zh.vtt 6 1
```

## Output

Each video gets a `.vocab.json` file in `~/.clawd/dashu-vocabulary/`:

```json
{
  "videoId": "yeqHX2rxeZI",
  "title": "Do Your Love Yourself? | Chinese Podcast #183",
  "processedAt": "2026-01-18T19:08:00.000Z",
  "chunksProcessed": 6,
  "vocabulary": [...]
}
```

## Cron Jobs

- **Continue mining**: Runs every hour to process pending chunks
- **New transcript mining**: Triggers when new transcripts are downloaded

## Files

- **Transcripts**: `~/.clawd/dashu-transcripts/`
- **Vocabulary**: `~/.clawd/dashu-vocabulary/`

Both keyed by video ID (e.g., `yeqHX2rxeZI`).
