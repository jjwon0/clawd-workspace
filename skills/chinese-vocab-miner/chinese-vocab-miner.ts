#!/usr/bin/env bun
/**
 * Chinese Vocabulary Miner
 * Extract useful vocabulary and grammar patterns from Chinese transcripts
 */

import { readFileSync, readdirSync } from "fs";

const TRANSCRIPTS_DIR = `${process.env.HOME}/.astra/dashu-transcripts`;
const CHUNK_SIZE = 50; // lines per chunk

interface VocabEntry {
  word: string;
  pinyin?: string;
  definition: string;
  example: string;
  level: "intermediate" | "advanced" | "upper-intermediate";
}

function parseVTT(content: string): string[] {
  const lines = content.split("\n");
  const sentences: string[] = [];
  let currentSentence = "";
  let expectText = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip headers
    if (trimmed === "WEBVTT" || trimmed.startsWith("Kind:") || trimmed.startsWith("Language:")) {
      continue;
    }
    
    // Timestamp line - next line will be the text
    if (trimmed.match(/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->/)) {
      expectText = true;
      continue;
    }
    
    // Empty line = end of entry
    if (trimmed === "") {
      if (currentSentence.trim().length > 2) {
        sentences.push(currentSentence.trim());
      }
      currentSentence = "";
      expectText = false;
      continue;
    }
    
    // Skip line numbers
    if (trimmed.match(/^\d+$/)) {
      continue;
    }
    
    // Collect Chinese text (skip English-only lines like "hello")
    if (expectText && trimmed && !trimmed.match(/^[a-zA-Z]+$/)) {
      currentSentence += trimmed + " ";
    }
  }
  
  // Don't forget the last sentence
  if (currentSentence.trim().length > 2) {
    sentences.push(currentSentence.trim());
  }
  
  return sentences.filter(s => s.length > 5);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function extractVocab(text: string): Promise<VocabEntry[]> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    console.log("⚠️ No GEMINI_API_KEY found, skipping extraction");
    return [];
  }
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a Chinese language tutor for upper-intermediate learners. 

Extract 5-10 useful vocabulary words or short phrases from this Chinese text. Focus on:
- Useful everyday expressions
- Idiomatic phrases
- Grammar patterns
- Words that are common but tricky for learners

For each entry, return ONLY a JSON array (no markdown, no explanation):

[
  {
    "word": "word or phrase in Chinese",
    "pinyin": "pinyin with tone marks",
    "definition": "English definition (brief)",
    "example": "example sentence from the text",
    "level": "upper-intermediate"
  }
]

Text:
${text.slice(0, 2000)}`
        }]
      }]
    })
  });

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  
  // Clean up markdown code blocks if present
  const cleaned = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse:", cleaned.slice(0, 200));
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const file = args[0] || `${TRANSCRIPTS_DIR}/NA_yeqHX2rxeZI_Do Your Love Yourself? | Chinese Podcast #183.zh.vtt.zh.vtt`;
  const chunkNum = parseInt(args[1]) || 0;

  console.log(`📚 Mining vocabulary from: ${file}`);
  console.log(`📦 Chunk: ${chunkNum}\n`);

  // Read and parse
  const content = readFileSync(file, "utf-8");
  const sentences = parseVTT(content);
  const chunks = chunkArray(sentences, CHUNK_SIZE);

  console.log(`📝 Total sentences: ${sentences.length}`);
  console.log(`📦 Total chunks: ${chunks.length}\n`);

  if (chunkNum >= chunks.length) {
    console.log(`❌ Chunk ${chunkNum} doesn't exist (max: ${chunks.length - 1})`);
    return;
  }

  const chunkText = chunks[chunkNum].join("\n");
  console.log(`🔍 Processing chunk ${chunkNum} (${chunks[chunkNum].length} sentences)...\n`);

  const vocab = await extractVocab(chunkText);

  console.log("✨ Extracted Vocabulary:\n");
  
  for (const entry of vocab) {
    console.log(`• ${entry.word} (${entry.pinyin})`);
    console.log(`  ${entry.definition}`);
    console.log(`  例: "${entry.example}"\n`);
  }

  console.log(`\n💾 Run with next chunk: bun scripts/chinese-vocab-miner.ts ${file} ${chunkNum + 1}`);
}

main().catch(console.error);
