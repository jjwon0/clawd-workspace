#!/usr/bin/env bun
/**
 * Chinese Vocabulary Miner - Process transcripts and output vocabulary JSON
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";

const TRANSCRIPTS_DIR = `${process.env.HOME}/.astra/dashu-transcripts`;
const VOCAB_DIR = `${process.env.HOME}/.astra/dashu-vocabulary`;
const CHUNK_SIZE = 50;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

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
  chunks: {
    chunkIndex: number;
    vocabulary: VocabEntry[];
  }[];
}

function parseVTT(content: string): string[] {
  const lines = content.split("\n");
  const sentences: string[] = [];
  let currentSentence = "";
  let expectText = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === "WEBVTT" || trimmed.startsWith("Kind:") || trimmed.startsWith("Language:")) {
      continue;
    }
    
    if (trimmed.match(/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->/)) {
      expectText = true;
      continue;
    }
    
    if (trimmed === "") {
      if (currentSentence.trim().length > 2) {
        sentences.push(currentSentence.trim());
      }
      currentSentence = "";
      expectText = false;
      continue;
    }
    
    if (trimmed.match(/^\d+$/)) {
      continue;
    }
    
    if (expectText && trimmed && !trimmed.match(/^[a-zA-Z]+$/)) {
      currentSentence += trimmed + " ";
    }
  }
  
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
  if (!GEMINI_API_KEY) {
    console.log("⚠️ No GEMINI_API_KEY found, skipping extraction");
    return [];
  }
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
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
  
  const cleaned = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse AI response");
    return [];
  }
}

async function processTranscript(filePath: string): Promise<VideoVocab | null> {
  const fileName = filePath.split("/").pop() || "";
  console.log(`📚 Processing: ${fileName}`);
  
  // Extract video ID from filename
  // Format: NA_videoId_title.zh.vtt.zh.vtt
  const match = fileName.match(/NA_([a-zA-Z0-9_-]+)_/);
  const videoId = match ? match[1] : "unknown";
  const title = fileName.replace(/NA_[a-zA-Z0-9_-]+_/, "").replace(/\.zh\.vtt\.zh\.vtt$/, "");
  
  // Check if already processed
  const vocabFilePath = `${VOCAB_DIR}/${videoId}.vocab.json`;
  if (existsSync(vocabFilePath)) {
    console.log(`  ✅ Already processed, skipping`);
    return null;
  }
  
  // Read and parse
  const content = readFileSync(filePath, "utf-8");
  const sentences = parseVTT(content);
  const chunks = chunkArray(sentences, CHUNK_SIZE);
  
  console.log(`  📝 ${sentences.length} sentences in ${chunks.length} chunks`);
  
  const result: VideoVocab = {
    videoId,
    title,
    processedAt: new Date().toISOString(),
    chunks: []
  };
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    console.log(`  🔍 Mining chunk ${i + 1}/${chunks.length}...`);
    const chunkText = chunks[i].join("\n");
    const vocab = await extractVocab(chunkText);
    
    if (vocab.length > 0) {
      result.chunks.push({
        chunkIndex: i,
        vocabulary: vocab
      });
      console.log(`    → Found ${vocab.length} words`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const specificFile = args[0];
  
  // Create output directory
  mkdirSync(VOCAB_DIR, { recursive: true });
  
  if (specificFile) {
    // Process single file
    const result = await processTranscript(specificFile);
    if (result) {
      const outputPath = `${VOCAB_DIR}/${result.videoId}.vocab.json`;
      writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`💾 Saved: ${outputPath}`);
    }
  } else {
    // Process all unprocessed transcripts
    const files = readdirSync(TRANSCRIPTS_DIR)
      .filter(f => f.endsWith(".zh.vtt.zh.vtt"))
      .map(f => `${TRANSCRIPTS_DIR}/${f}`);
    
    console.log(`🎯 Found ${files.length} transcripts to process\n`);
    
    for (const file of files) {
      const result = await processTranscript(file);
      if (result) {
        const outputPath = `${VOCAB_DIR}/${result.videoId}.vocab.json`;
        writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`💾 Saved: ${outputPath}\n`);
      }
    }
  }
  
  console.log("✨ Done!");
}

main().catch(console.error);
