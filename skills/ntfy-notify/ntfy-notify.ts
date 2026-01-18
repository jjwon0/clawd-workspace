#!/usr/bin/env bun
/**
 * NTFY Push Notifications
 * 
 * Usage:
 *   bun run ./skills/ntfy-notify/ntfy-notify.ts "message" [options]
 * 
 * Options:
 *   --title <text>     Notification title
 *   --priority <p>     Priority: low, default, high, max
 *   --tag <emoji>      Single tag/emoji
 *   --tags <e1,e2>     Multiple tags
 *   --delay <duration> Delay delivery (e.g., "10m", "1h")
 */

import { execSync } from "child_process";

const TOPIC = "jjwon-notifications";
const DEFAULT_TITLE = "Clawdbot";

// Parse arguments - message is first positional, flags are optional
const rawArgs = process.argv.slice(2);
const messageIndex = rawArgs.findIndex(arg => !arg.startsWith("--"));
const message = messageIndex >= 0 ? rawArgs[messageIndex] : "";
const flags = rawArgs.slice(0, messageIndex >= 0 ? messageIndex : rawArgs.length);

let title = DEFAULT_TITLE;
let priority = "";
let tags: string[] = [];
let delay = "";

for (let i = 0; i < flags.length; i += 2) {
  const arg = flags[i];
  const next = flags[i + 1] || "";
  
  if (arg === "--title" && next) {
    title = next;
  } else if (arg === "--priority" && next) {
    priority = next;
  } else if ((arg === "--tag" || arg === "--tags") && next) {
    if (next.includes(",")) {
      tags.push(...next.split(","));
    } else {
      tags.push(next);
    }
  } else if (arg === "--delay" && next) {
    delay = next;
  }
}

if (!message) {
  console.log(`Usage: bun run ./skills/ntfy-notify/ntfy-notify.ts "message" [options]`);
  console.log(`Options:`);
  console.log(`  --title <text>     Notification title (default: "${DEFAULT_TITLE}")`);
  console.log(`  --priority <p>     Priority: low, default, high, max`);
  console.log(`  --tag <emoji>      Single tag/emoji`);
  console.log(`  --tags <e1,e2>     Multiple tags`);
  console.log(`  --delay <duration> Delay delivery (e.g., "10m", "1h")`);
  process.exit(1);
}

// Build ntfy command
const topic = process.env.NTFY_TOPIC || TOPIC;
let cmd = `ntfy publish -t "${title}" ${topic}`;

if (priority) {
  cmd += ` -p ${priority}`;
}

if (delay) {
  cmd += ` --delay=${delay}`;
}

if (tags.length > 0) {
  cmd += ` --tag ${tags.join(",")}`;
}

// Add message (escape quotes)
const safeMessage = message.replace(/"/g, '\\"');
cmd += ` "${safeMessage}"`;

console.log(`📱 Sending notification...`);
console.log(`   Topic: ${topic}`);
console.log(`   Title: ${title}`);
console.log(`   Message: ${message}`);

if (priority) console.log(`   Priority: ${priority}`);
if (tags.length > 0) console.log(`   Tags: ${tags.join(", ")}`);
if (delay) console.log(`   Delay: ${delay}`);

try {
  execSync(cmd, { stdio: "inherit" });
  console.log(`✅ Notification sent!`);
} catch (error) {
  console.error(`❌ Failed to send notification:`);
  console.error(error);
  process.exit(1);
}
