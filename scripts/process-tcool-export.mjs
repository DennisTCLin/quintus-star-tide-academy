#!/usr/bin/env node
// ============================================================
// Process Tcool Export → Codebase question format
// ============================================================
//
// Usage:
//   node scripts/process-tcool-export.mjs <tcool-export.json> [--dry-run]
//
// Reads a JSON file produced by scripts/tcool-extractor.js,
// deduplicates against existing questions, and appends new
// questions to the appropriate data file.
//
// Output: src/data/tcool-imports/<subject>-<examId>.json
// Then add it to the appropriate exam module.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data', 'tcool-imports');

const SUBJECT_MAP = {
  '數學': { subject: 'math', course: 'math' },
  '國語': { subject: 'chinese', course: 'chinese' },
  '英語': { subject: 'english', course: 'english' },
  '自然': { subject: 'science', course: 'science' },
  '社會': { subject: 'social', course: 'social' },
};

function generateId(examId, questionNum, prompt) {
  const hash = createHash('sha256')
    .update(`${examId}-${questionNum}-${prompt}`)
    .digest('hex')
    .substring(0, 16);
  return `tc-${hash}`;
}

function estimateLevel(prompt, options) {
  const text = prompt + options.join('');
  if (text.length > 100 || text.includes('圖') || text.includes('表')) return 3;
  if (text.length > 60 || text.includes('求') || text.includes('算式')) return 2;
  return 1;
}

function loadExistingPrompts() {
  const prompts = new Set();
  const dataDir = join(ROOT, 'src', 'data');

  // Scan all JSON files in src/data/ for existing prompts
  const files = [
    'math-exams-20261025.json',
    'chinese-exams-20261025.json',
    'chinese-exams-20261026.json',
    'english-exams-20261025.json',
    'english-extra-20261026.json',
    'science-exams-20261025.json',
    'social-exams-20261025.json',
    'g6-general-practice.json',
    'hanlin-chinese-20261025.json',
    'hanlin-chinese-extra-20261026.json',
  ];

  for (const file of files) {
    const path = join(dataDir, file);
    if (!existsSync(path)) continue;
    try {
      const data = JSON.parse(readFileSync(path, 'utf8'));
      for (const q of data) {
        if (q.prompt) prompts.add(normalizePrompt(q.prompt));
      }
    } catch { /* skip */ }
  }

  // Also check tcool-imports directory
  if (existsSync(DATA_DIR)) {
    const importFiles = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    for (const file of importFiles) {
      try {
        const data = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
        for (const q of data) {
          if (q.prompt) prompts.add(normalizePrompt(q.prompt));
        }
      } catch { /* skip */ }
    }
  }

  // Also check the TypeScript exam files for inline questions
  const tsFiles = [
    'grade6-math-exams.ts',
    'grade6-english-exams.ts',
    'grade6-supplement-exams.ts',
  ];

  for (const file of tsFiles) {
    const path = join(ROOT, 'src', file);
    if (!existsSync(path)) continue;
    try {
      const content = readFileSync(path, 'utf8');
      const promptMatches = content.matchAll(/"prompt":\s*"([^"]+)"/g);
      for (const m of promptMatches) {
        prompts.add(normalizePrompt(m[1]));
      }
    } catch { /* skip */ }
  }

  return prompts;
}

function normalizePrompt(prompt) {
  return prompt
    .replace(/\s+/g, '')
    .replace(/[，。？！、；：""''（）【】]/g, '')
    .toLowerCase();
}

function processExport(inputPath, dryRun = false) {
  console.log(`📖 Reading: ${inputPath}`);
  const raw = JSON.parse(readFileSync(inputPath, 'utf8'));

  const { examInfo, questions } = raw;
  if (!questions?.length) {
    console.error('❌ No questions found in export file');
    process.exit(1);
  }

  console.log(`📋 Exam: ${examInfo.school} ${examInfo.subject} G${examInfo.grade} ${examInfo.semester} ${examInfo.examPeriod} ${examInfo.publisher}`);
  console.log(`   Total questions in export: ${questions.length}`);

  const subjectInfo = SUBJECT_MAP[examInfo.subject];
  if (!subjectInfo) {
    console.error(`❌ Unknown subject: ${examInfo.subject}`);
    process.exit(1);
  }

  // Load existing prompts for dedup
  console.log('🔍 Loading existing questions for deduplication...');
  const existingPrompts = loadExistingPrompts();
  console.log(`   Found ${existingPrompts.size} existing prompts`);

  // Process questions
  const processed = [];
  let skippedDup = 0;
  let skippedImage = 0;
  let skippedBadAnswer = 0;

  for (const q of questions) {
    // Skip image-only questions
    if (q.hasImage && (!q.prompt || q.prompt.length < 5)) {
      skippedImage++;
      continue;
    }

    // Skip questions with invalid answers
    if (q.answer < 0 || q.answer > 3) {
      skippedBadAnswer++;
      continue;
    }

    // Check for duplicates
    if (existingPrompts.has(normalizePrompt(q.prompt))) {
      skippedDup++;
      continue;
    }

    const id = generateId(examInfo.examId, q.questionNum, q.prompt);

    processed.push({
      id,
      grade: examInfo.grade,
      subject: subjectInfo.subject,
      course: subjectInfo.course,
      publisher: examInfo.publisher,
      level: estimateLevel(q.prompt, q.options),
      prompt: q.prompt,
      options: q.options.map(text => ({ text })),
      answer: q.answer,
      hint: '先整理已知條件，留意題目問的是什麼。',
      explanation: `正確答案是選項 ${q.answer + 1}。`,
      examSources: [{
        id: `tc${examInfo.examId}`,
        locator: `Q${q.questionNum}`,
        tcoolId: q.tcoolId,
      }],
    });

    existingPrompts.add(normalizePrompt(q.prompt));
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ New questions: ${processed.length}`);
  console.log(`   ⏭️  Skipped (duplicate): ${skippedDup}`);
  console.log(`   🖼️  Skipped (image-only): ${skippedImage}`);
  console.log(`   ❌ Skipped (bad answer): ${skippedBadAnswer}`);

  if (processed.length === 0) {
    console.log('\n🎯 No new questions to add — all were duplicates or had issues.');
    return;
  }

  // Write output
  const outputFilename = `${subjectInfo.subject}-tc${examInfo.examId}.json`;
  const outputPath = join(DATA_DIR, outputFilename);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN — would write ${processed.length} questions to:`);
    console.log(`   ${outputPath}`);
    console.log('\nSample question:');
    console.log(JSON.stringify(processed[0], null, 2));
    return;
  }

  mkdirSync(DATA_DIR, { recursive: true });

  // If file exists, merge
  let existing = [];
  if (existsSync(outputPath)) {
    existing = JSON.parse(readFileSync(outputPath, 'utf8'));
    console.log(`   📁 Merging with ${existing.length} existing questions in ${outputFilename}`);
  }

  const merged = [...existing, ...processed];
  writeFileSync(outputPath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`\n✅ Wrote ${merged.length} questions to: ${outputPath}`);

  // Print integration instructions
  console.log(`\n📝 To integrate into the app:`);
  console.log(`   1. Create/update a TypeScript module that imports this JSON`);
  console.log(`   2. Add it to LEARNING_BANK in src/learning.ts`);
  console.log(`   3. Run: npm test`);
  console.log(`\n   Example module (src/tcool-${subjectInfo.subject}-exams.ts):`);
  console.log(`   ─────────────────────────────────────────────`);
  console.log(`   import type {LearningQuestion} from './learning';`);
  console.log(`   import rows from './data/tcool-imports/${outputFilename}';`);
  console.log(`   export const TCOOL_${subjectInfo.subject.toUpperCase()}_EXAMS: LearningQuestion[] = rows as LearningQuestion[];`);
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const inputFile = args.find(a => !a.startsWith('--'));

if (!inputFile) {
  console.log('Usage: node scripts/process-tcool-export.mjs <tcool-export.json> [--dry-run]');
  console.log('');
  console.log('Process a JSON file exported by the Chrome tcool-extractor script.');
  console.log('Deduplicates against existing questions and writes to src/data/tcool-imports/.');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run    Preview what would be written without changing files');
  process.exit(0);
}

processExport(inputFile, dryRun);
