#!/usr/bin/env bun
/**
 * Simple Vocabulary Miner - Process one transcript, append to existing vocab
 *
 * Usage:
 *   bun run scripts/dashu-vocab-miner-simple.ts video.vtt              # Process chunks 0-2
 *   bun run scripts/dashu-vocab-miner-simple.ts video.vtt 3            # Process chunks 3-5
 *   bun run scripts/dashu-vocab-miner-simple.ts video.vtt 0 1          # Process just chunk 0
 *   bun run scripts/dashu-vocab-miner-simple.ts --status video.vtt     # Check status
 *   bun run scripts/dashu-vocab-miner-simple.ts --continue video.vtt   # Continue from last chunk
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const FLAG = process.argv[2]?.startsWith("--") ? process.argv[2] : null;
const PATH_ARG = FLAG ? process.argv[3] : process.argv[2];
const START_CHUNK = FLAG ? null : parseInt(process.argv[3]) || 0;
const NUM_CHUNKS = FLAG ? null : parseInt(process.argv[4]) || 3;

if (!PATH_ARG) {
  console.log(`Usage:`);
  console.log(`  bun run scripts/dashu-vocab-miner-simple.ts <transcript> [start_chunk] [num_chunks]`);
  console.log(`  bun run scripts/dashu-vocab-miner-simple.ts --status <transcript>`);
  console.log(`  bun run scripts/dashu-vocab-miner-simple.ts --continue <transcript>`);
  process.exit(1);
}

if (FLAG === "--status") {
  showStatus(PATH_ARG);
  process.exit(0);
}

if (FLAG === "--continue") {
  continueFromLast(PATH_ARG);
  process.exit(0);
}

if (!GEMINI_API_KEY) {
  console.log("Error: GEMINI_API_KEY not set");
  process.exit(1);
}

interface VocabEntry {
  word: string;
  pinyin: string;
  definition: string;
  example: string;
  level: string;
}

interface VideoVocab {
  videoId: string;
  title: string;
  processedAt: string;
  chunksProcessed?: number;
  vocabulary: VocabEntry[];
}

function parseVTT(content: string): string[] {
  const lines = content.split("\n");
  const sentences: string[] = [];
  let currentSentence = "";
  let expectText = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "WEBVTT" || trimmed.startsWith("Kind:") || trimmed.startsWith("Language:")) continue;
    if (trimmed.match(/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->/)) { expectText = true; continue; }
    if (trimmed === "") { if (currentSentence.trim().length > 2) sentences.push(currentSentence.trim()); currentSentence = ""; expectText = false; continue; }
    if (trimmed.match(/^\d+$/)) continue;
    if (expectText && trimmed && !trimmed.match(/^[a-zA-Z]+$/)) currentSentence += trimmed + " ";
  }
  if (currentSentence.trim().length > 2) sentences.push(currentSentence.trim());
  return sentences.filter(s => s.length > 5);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function showStatus(transcriptPath: string) {
  const fileName = transcriptPath.split("/").pop() || "";
  const match = fileName.match(/NA_([a-zA-Z0-9_-]+)_/);
  const videoId = match ? match[1] : "unknown";
  const outputPath = `${process.env.HOME}/.astra/dashu-vocabulary/${videoId}.vocab.json`;

  const content = readFileSync(transcriptPath, "utf-8");
  const sentences = parseVTT(content);
  const chunks = chunkArray(sentences, 50);

  console.log(`\n📊 Status: ${fileName}`);
  console.log(`   Total: ${sentences.length} sentences, ${chunks.length} chunks`);

  if (!existsSync(outputPath)) {
    console.log(`   ❌ No vocabulary yet`);
    console.log(`   → bun run scripts/dashu-vocab-miner-simple.ts "${transcriptPath}"\n`);
    return;
  }

  try {
    const existing = JSON.parse(readFileSync(outputPath, "utf-8"));
    const done = existing.chunksProcessed || 0;
    const percent = Math.round((done / chunks.length) * 100);

    console.log(`   ✅ ${done}/${chunks.length} chunks (${percent}%)`);
    console.log(`   📚 ${existing.vocabulary?.length || 0} words`);

    if (done >= chunks.length) {
      console.log(`   🎉 Fully processed!\n`);
    } else {
      console.log(`   → bun run scripts/dashu-vocab-miner-simple.ts "${transcriptPath}" ${done}\n`);
    }
  } catch {
    console.log(`   ⚠️ Could not read vocab file\n`);
  }
}

function continueFromLast(transcriptPath: string) {
  const fileName = transcriptPath.split("/").pop() || "";
  const match = fileName.match(/NA_([a-zA-Z0-9_-]+)_/);
  const videoId = match ? match[1] : "unknown";
  const outputPath = `${process.env.HOME}/.astra/dashu-vocabulary/${videoId}.vocab.json`;

  if (!existsSync(outputPath)) {
    console.log(`\n📚 No existing vocab, starting fresh...`);
    console.log(`   bun run scripts/dashu-vocab-miner-simple.ts "${transcriptPath}"\n`);
    return;
  }

  try {
    const existing = JSON.parse(readFileSync(outputPath, "utf-8"));
    const lastChunk = existing.chunksProcessed || 0;
    console.log(`\n🔄 Resuming from chunk ${lastChunk}...`);
    console.log(`   bun run scripts/dashu-vocab-miner-simple.ts "${transcriptPath}" ${lastChunk}\n`);
  } catch {
    console.log(`\n⚠️ Could not read vocab file\n`);
  }
}

async function extractVocab(text: string): Promise<VocabEntry[]> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Extract 5-8 useful Chinese vocabulary words from this text. Return ONLY JSON array: [{\"word\": \"word\", \"pinyin\": \"pinyin\", \"definition\": \"def\", \"example\": \"ex\", \"level\": \"upper\"}] Text: ${text.slice(0, 1500)}` }] }]
    })
  });

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const cleaned = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();

  try { return JSON.parse(cleaned); } catch { return []; }
}

async function main() {
  const fileName = PATH_ARG.split("/").pop() || "";
  const match = fileName.match(/NA_([a-zA-Z0-9_-]+)_/);
  const videoId = match ? match[1] : "unknown";
  const title = fileName.replace(/NA_[a-zA-Z0-9_-]+_/, "").replace(/\.zh\.vtt\.zh\.vtt$/, "");

  const outputPath = `${process.env.HOME}/.astra/dashu-vocabulary/${videoId}.vocab.json`;

  let existingVocab: VocabEntry[] = [];
  let existingChunks = 0;

  if (existsSync(outputPath)) {
    console.log(`📖 Found existing vocabulary`);
    try {
      const existing = JSON.parse(readFileSync(outputPath, "utf-8"));
      existingVocab = existing.vocabulary || [];
      existingChunks = existing.chunksProcessed || 0;
      console.log(`   → ${existingVocab.length} words from ${existingChunks} chunks`);
    } catch {}
  }

  console.log(`\n📚 Processing: ${fileName}`);
  console.log(`   Video ID: ${videoId}`);
  console.log(`   Starting chunk: ${START_CHUNK}, count: ${NUM_CHUNKS}\n`);

  const content = readFileSync(PATH_ARG, "utf-8");
  const sentences = parseVTT(content);
  const allChunks = chunkArray(sentences, 50);

  console.log(`📝 ${sentences.length} sentences in ${allChunks.length} total chunks`);

  const newVocab: VocabEntry[] = [];

  for (let i = 0; i < NUM_CHUNKS; i++) {
    const chunkIdx = START_CHUNK + i;
    if (chunkIdx >= allChunks.length) break;

    const chunkText = allChunks[chunkIdx].join("\n");
    if (chunkText.length < 20) break;

    console.log(`🔍 Mining chunk ${chunkIdx + 1}/${allChunks.length}...`);
    const vocab = await extractVocab(chunkText);
    console.log(`  → ${vocab.length} words`);
    newVocab.push(...vocab);

    await new Promise(r => setTimeout(r, 1000));
  }

  const wordMap = new Map();
  [...existingVocab, ...newVocab].forEach(entry => {
    if (!wordMap.has(entry.word)) wordMap.set(entry.word, entry);
  });

  const combinedVocab = Array.from(wordMap.values());

  const result: VideoVocab = {
    videoId,
    title,
    processedAt: new Date().toISOString(),
    chunksProcessed: existingChunks + (newVocab.length > 0 ? NUM_CHUNKS : 0),
    vocabulary: combinedVocab
  };

  writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log(`\n💾 Saved: ${outputPath}`);
  console.log(`✨ Total: ${combinedVocab.length} words (${existingVocab.length} existing + ${newVocab.length} new)`);

  if (START_CHUNK + NUM_CHUNKS < allChunks.length) {
    console.log(`\n→ Continue: bun run scripts/dashu-vocab-miner-simple.ts "${PATH_ARG}" ${START_CHUNK + NUM_CHUNKS}`);
  } else {
    console.log(`\n🎉 All chunks done!`);
  }
}

main().catch(console.error);
