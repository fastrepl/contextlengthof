import { readFileSync } from 'node:fs';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const unclearPhrase = 'is all you need to edit';

if (readme.includes(unclearPhrase)) {
  console.error(`README uses overly broad guidance: "${unclearPhrase}"`);
  process.exit(1);
}

console.log('README phrasing check passed.');
