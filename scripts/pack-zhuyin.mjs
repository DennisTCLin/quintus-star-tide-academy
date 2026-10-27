import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Keep the reviewed dictionary readable; only its runtime representation changes.
const source = new URL('../src/data/interface-zhuyin.json', import.meta.url);
const target = new URL('../src/data/interface-zhuyin-packed.json', import.meta.url);
const dictionary = JSON.parse(readFileSync(source, 'utf8'));
const syllables = [...new Set([
  ...Object.values(dictionary.chars),
  ...Object.values(dictionary.phrases).flat(),
])].sort();
const indexes = new Map(syllables.map((value, index) => [value, index]));
const indexOf = value => {
  const index = indexes.get(value);
  if (index === undefined) throw new Error(`Missing syllable: ${value}`);
  return index;
};
const packed = {
  syllables,
  phrases: Object.fromEntries(Object.entries(dictionary.phrases).map(([word, values]) =>
    [word, values.map(indexOf)])),
  chars: Object.fromEntries(Object.entries(dictionary.chars).map(([char, value]) =>
    [char, indexOf(value)])),
};
const output = JSON.stringify(packed) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) {
    console.error('Packed dictionary is stale. Run npm run build:zhuyin.');
    process.exitCode = 1;
  }
} else {
  writeFileSync(target, output);
  console.log(`Packed ${Object.keys(packed.phrases).length} phrases and ${Object.keys(packed.chars).length} characters into ${syllables.length} shared syllables: ${fileURLToPath(target)}`);
}
