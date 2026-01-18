# NTFY Push Notifications

Send push notifications to your devices via [ntfy.sh](https://ntfy.sh).

## Setup

```bash
# Install ntfy CLI (if not already installed)
brew install ntfy  # macOS
# or
pip install ntfy  # Python
```

## Configuration

The skill uses topic: `jjwon-notifications`

You can customize the topic by setting `NTFY_TOPIC` environment variable.

## Usage

```bash
# Send a simple notification
bun run skills/ntfy-notify.ts "Hello from Clawdbot!"

# Send with title
bun run skills/ntfy-notify.ts "Your task is ready" --title "Task Alert"

# Send with priority (low, default, high, max)
bun run skills/ntfy-notify.ts "Urgent!" --priority high

# Send with tags (emoji)
bun run skills/ntfy-notify.ts "Deployment done" --tag rocket

# Send to different topic
NTFY_TOPIC=other-topic bun run skills/ntfy-notify.ts "Message"
```

## Options

| Flag | Description |
|------|-------------|
| `--title` | Notification title (default: "Clawdbot") |
| `--priority` | Priority: low, default, high, max |
| `--tag` | Emoji tag (shown in notification) |
| `--tags` | Comma-separated tags |
| `--delay` | Delay delivery (e.g., "10m", "1h") |

## Examples

```bash
# Daily reminder
bun run skills/ntfy-notify.ts "Stand up!" --title "Health" --tag walking

# Error alert
bun run skills/ntfy-notify.ts "Job failed" --priority max --tag warning

# Scheduled message
bun run skills/ntfy-notify.ts "Meeting in 10min" --delay 10m --tag calendar
```

## Cron Integration

Add to cron jobs for notifications:

```bash
# Daily summary at 6pm
0 18 * * * cd /Users/jjwon/clawd && bun run skills/ntfy-notify.ts "Daily summary: $(date +%Y-%m-%d)" --title "End of Day"
```

## Topics

- Default: `jjwon-notifications`
- Custom: Set `NTFY_TOPIC` environment variable
