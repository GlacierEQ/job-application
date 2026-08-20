#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import gapRuntime from '../deployment/vercel-source-bridge/api/recruiter-gap-analysis.js';
import { buildLiveRecruiterRoleMatrix } from './live-recruiter-role-matrix.mjs';

const {
  RecruiterGapAnalysisError: LiveRecruiterGapAnalysisError,
  analyzeRecruiterGaps,
} = gapRuntime;

export { LiveRecruiterGapAnalysisError, analyzeRecruiterGaps };

function requireValue(condition, message) {
  if (!condition) throw new LiveRecruiterGapAnalysisError(message);
}

function parseArgs(argv) {
  const args = { matrix: null, output: null, topology: null, asOf: new Date() };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--matrix') {
      requireValue(value, 'gap_matrix_requires_value');
      args.matrix = path.resolve(value);
      index += 1;
    } else if (arg === '--output') {
      requireValue(value, 'gap_output_requires_value');
      args.output = path.resolve(value);
      index += 1;
    } else if (arg === '--topology') {
      requireValue(value, 'gap_topology_requires_value');
      args.topology = path.resolve(value);
      index += 1;
    } else if (arg === '--as-of') {
      requireValue(value, 'gap_as_of_requires_value');
      args.asOf = new Date(value);
      requireValue(!Number.isNaN(args.asOf.getTime()), 'gap_invalid_as_of');
      index += 1;
    } else {
      throw new LiveRecruiterGapAnalysisError(`gap_unknown_argument:${arg}`);
    }
  }
  requireValue(
    !(args.matrix && args.topology),
    'gap_matrix_and_topology_are_mutually_exclusive',
  );
  return args;
}

function loadJson(target, label) {
  requireValue(fs.existsSync(target), `gap_${label}_not_found`);
  let value;
  try {
    value = JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    throw new LiveRecruiterGapAnalysisError(
      `gap_${label}_invalid_json:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  requireValue(value && typeof value === 'object' && !Array.isArray(value), `gap_${label}_object`);
  return value;
}

function writeAtomicJson(target, payload) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  let matrix;
  if (args.matrix) {
    matrix = loadJson(args.matrix, 'matrix');
  } else {
    const topology = args.topology ? loadJson(args.topology, 'topology') : null;
    requireValue(topology, 'gap_live_mode_requires_topology_or_matrix');
    matrix = await buildLiveRecruiterRoleMatrix(topology, { asOf: args.asOf });
  }
  const result = analyzeRecruiterGaps(matrix);
  if (args.output) writeAtomicJson(args.output, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack || error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
