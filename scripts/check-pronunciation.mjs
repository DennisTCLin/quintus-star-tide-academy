import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const read = p => JSON.parse(readFileSync(p, 'utf8'));
const dictionary = read('src/data/interface-zhuyin.json');
const reviewed = read('src/data/taiwan-zhuyin-overrides.json');
const garden = read('src/data/garden.json');
const failures = [];
const runs = new Set();
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['__tests__', 'vendor'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (/\.tsx?$/.test(path) && !path.endsWith('.d.ts'))
      for (const match of readFileSync(path, 'utf8').matchAll(/[\u3400-\u9fff]+/gu)) runs.add(match[0]);
  }
}
scan('src');
const lessons = [...garden.themes.flatMap(t => t.items), ...garden.tones, ...garden.medials, ...garden.pairs];
for (const lesson of lessons) runs.add(lesson.word);
const validSyllable = /^(?:˙[ㄅ-ㄩ]+|[ㄅ-ㄩ]+[ˊˇˋ]?)$/u;
function validate(word, readings) {
  if (readings.length !== [...word].length || readings.some(z => !validSyllable.test(z)))
    failures.push(`Invalid syllables: ${word}`);
}
for (const [word, readings] of Object.entries(dictionary.phrases)) validate(word, readings);
for (const [char, reading] of Object.entries(dictionary.chars)) validate(char, [reading]);
for (const [char, rule] of Object.entries(reviewed.characterReadings)) {
  if (rule.from.includes(dictionary.chars[char])) failures.push(`Known wrong character reading: ${char}`);
  for (const [word, readings] of Object.entries(dictionary.phrases))
    [...word].forEach((c, i) => {
      if (c === char && rule.from.includes(readings[i])) failures.push(`Known wrong reading: ${char} in ${word}`);
    });
}
for (const lesson of lessons) {
  validate(lesson.word, lesson.zy.split(/\s+/));
  if (!existsSync(`public/garden/audio/higgsfield/${lesson.id}.mp3`)) failures.push(`Missing lesson recording: ${lesson.id}`);
}
for (const run of runs) {
  if (run.length > 1 && !dictionary.phrases[run]) failures.push(`Unreviewed text: ${run}`);
  for (const char of run) if (!dictionary.chars[char]) failures.push(`Missing character: ${char}`);
}
for (const [word, expected] of Object.entries(reviewed.phrases)) {
  for (const [sentence, readings] of Object.entries(dictionary.phrases)) {
    for (let i = sentence.indexOf(word); i !== -1; i = sentence.indexOf(word, i + 1))
      if (JSON.stringify(readings.slice(i, i + word.length)) !== JSON.stringify(expected))
        failures.push(`Reviewed reading changed: ${word} in ${sentence}`);
  }
  if (!dictionary.phrases[word]) failures.push(`Missing reviewed phrase: ${word}`);
}
if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  console.error('Review new text against Taiwan MOE readings, update reviewed context rules, then regenerate with scripts/build-zhuyin.py.');
  process.exit(1);
}
console.log(`Pronunciation checks passed: ${runs.size} source runs, ${lessons.length} curated lessons, ${Object.keys(reviewed.phrases).length} reviewed context rules.`);
