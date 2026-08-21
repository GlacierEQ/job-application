#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import actionRuntime from '../deployment/vercel-source-bridge/api/recruiter-action-runtime.js';

const {
  SCHEMA,
  SUPPORTED_ROLES,
  RecruiterActionPacketError,
  buildRecruiterActionPacket,
} = actionRuntime;

function requireValue(condition, message) {
  if (!condition) throw new RecruiterActionPacketError(message);
}

function parseArgs(argv) {
  const args = { matrix: null, role: null, maxActions: 3, output: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--matrix') {
      requireValue(value, 'action_packet_matrix_requires_value');
      args.matrix = path.resolve(value);
      index += 1;
    } else if (arg === '--role') {
      requireValue(value, 'action_packet_role_requires_value');
      args.role = value;
      index += 1;
    } else if (arg === '--max-actions') {
      requireValue(value, 'action_packet_max_actions_requires_value');
      args.maxActions = Number(value);
      index += 1;
    } else if (arg === '--output') {
      requireValue(value, 'action_packet_output_requires_value');
      args.output = path.resolve(value);
      index += 1;
    } else {
      throw new RecruiterActionPacketError(`action_packet_unknown_argument:${arg}`);
    }
  }
  requireValue(args.matrix, 'action_packet_matrix_required');
  requireValue(args.role, 'action_packet_role_required');
  return args;
}

function loadJson(target) {
  requireValue(fs.existsSync(target), 'action_packet_matrix_not_found');
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    throw new RecruiterActionPacketError(
      `action_packet_matrix_invalid_json:${error instanceof Error ? error.message : String(error)}`,
    );
  }
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

export function main(argv = process.argv) {
  const args = parseArgs(argv);
  const packet = buildRecruiterActionPacket(loadJson(args.matrix), args.role, {
    maxActions: args.maxActions,
  });
  if (args.output) writeAtomicJson(args.output, packet);
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
  return packet;
}

export {
  SCHEMA,
  SUPPORTED_ROLES,
  RecruiterActionPacketError,
  buildRecruiterActionPacket,
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
