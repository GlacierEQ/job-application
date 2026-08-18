#!/usr/bin/env node

import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ESTATE = path.join(ROOT, 'site-v15', 'estate', 'index.html');
const VERIFY_ONLY = process.argv.includes('--check');
const BASE_ANCHOR = '  <link rel="stylesheet" href="/assets/site.css">';
const SYSTEMS_ANCHOR = '  <link rel="stylesheet" href="/assets/site.systems.css">';

function normalize(source) {
  if (source.includes(SYSTEMS_ANCHOR)) return source;
  if (!source.includes(BASE_ANCHOR)) throw new Error('estate base stylesheet anchor missing');
  return source.replace(BASE_ANCHOR, `${BASE_ANCHOR}\n${SYSTEMS_ANCHOR}`);
}

const source = await readFile(ESTATE, 'utf8');
const normalized = normalize(source);

if (VERIFY_ONLY) {
  if (normalized !== source) throw new Error('estate complete-design anchor is not normalized');
} else if (normalized !== source) {
  const temporary = `${ESTATE}.tmp`;
  await writeFile(temporary, normalized, 'utf8');
  await rename(temporary, ESTATE);
}

console.log(JSON.stringify({
  status: 'PASS',
  mode: VERIFY_ONLY ? 'check' : 'apply',
  systems_stylesheet: true,
  estate_route: '/estate/',
}, null, 2));
