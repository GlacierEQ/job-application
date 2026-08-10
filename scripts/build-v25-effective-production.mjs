#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMPILER = path.join(ROOT, 'deployment', 'vercel-source-bridge', 'api', 'compiler-proxy.js');
const BUILDER = path.join(ROOT, 'scripts', 'build-v25-deployment-bundle.mjs');
const DEFAULT_OUTPUT = path.join(ROOT, 'artifacts', 'v25-deployment-effective');
const SHA40 = /^[a-f0-9]{40}$/;

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const out = { sourceCommit: '', helixCommit: '', outputDir: DEFAULT_OUTPUT };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    requireValue(value && !value.startsWith('--'), `${key}_requires_value`);
    if (key === '--source-commit') out.sourceCommit = value;
    else if (key === '--helix-commit') out.helixCommit = value;
    else if (key === '--output-dir') out.outputDir = path.resolve(value);
    else throw new Error(`unknown_argument:${key}`);
    i += 1;
  }
  requireValue(SHA40.test(out.sourceCommit), 'source_commit_must_be_full_lowercase_sha');
  requireValue(SHA40.test(out.helixCommit), 'helix_commit_must_be_full_lowercase_sha');
  return out;
}

function replaceOnce(source, pattern, replacement, label) {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) || [];
  requireValue(matches.length === 1, `${label}_anchor_count:${matches.length}`);
  return source.replace(pattern, replacement);
}

function transformCompiler(source, helixCommit) {
  let next = source;
  next = replaceOnce(
    next,
    /const COMPILER_HELIX_COMMIT = '[a-f0-9]{40}';/,
    `const COMPILER_HELIX_COMMIT = '${helixCommit}';`,
    'compiler_helix_pin',
  );
  next = replaceOnce(
    next,
    /const SECOND_DEPTH_PATH = 'manifests\/company_second_depth\.json';/,
    "const SECOND_DEPTH_PATH = 'manifests/company_second_depth.json';\nconst SECOND_DEPTH_OVERRIDE_INDEX_PATH = 'manifests/company_second_depth_overrides/index.json';",
    'second_depth_override_index_constant',
  );

  const helper = `function cloneJson(value) {\n  return JSON.parse(JSON.stringify(value));\n}\n\nasync function loadEffectiveSecondDepth(base) {\n  requireValue(base?.authority === 'GlacierEQ/job-app-helix', 'compiler_second_depth_authority');\n  requireValue(base?.company_overrides && typeof base.company_overrides === 'object' && !Array.isArray(base.company_overrides), 'compiler_second_depth_company_overrides');\n  const effective = cloneJson(base);\n  const overrideIndex = (await fetchHelixJson(SECOND_DEPTH_OVERRIDE_INDEX_PATH, 'second_depth_override_index')).value;\n  requireValue(overrideIndex.schema === 'glaciereq.company-second-depth-overrides.v1', 'compiler_second_depth_override_schema');\n  requireValue(overrideIndex.authority === 'GlacierEQ/job-app-helix', 'compiler_second_depth_override_authority');\n  requireValue(overrideIndex.merge_order === 'base_company_second_depth_then_company_module', 'compiler_second_depth_override_merge_order');\n  requireValue(Array.isArray(overrideIndex.overrides), 'compiler_second_depth_override_rows');\n  const seen = new Set();\n  for (const ref of overrideIndex.overrides) {\n    requireValue(ref && typeof ref === 'object' && !Array.isArray(ref), 'compiler_second_depth_override_ref');\n    requireValue(typeof ref.company_id === 'string' && COMPANY_ID.test(ref.company_id), 'compiler_second_depth_override_company_id');\n    requireValue(typeof ref.path === 'string' && ref.path.startsWith('manifests/company_second_depth_overrides/') && ref.path.endsWith('.json'), 'compiler_second_depth_override_path');\n    requireValue(!seen.has(ref.company_id), \`compiler_second_depth_override_duplicate_ref:\${ref.company_id}\`);\n    requireValue(!Object.hasOwn(effective.company_overrides, ref.company_id), \`compiler_second_depth_inline_modular_duplicate:\${ref.company_id}\`);\n    seen.add(ref.company_id);\n    const module = (await fetchHelixJson(ref.path, \`second_depth_override:\${ref.company_id}\`)).value;\n    requireValue(module.schema === 'glaciereq.company-second-depth-company.v1', \`compiler_second_depth_override_module_schema:\${ref.company_id}\`);\n    requireValue(module.company_id === ref.company_id, \`compiler_second_depth_override_module_identity:\${ref.company_id}\`);\n    requireValue(module.state && typeof module.state === 'object' && !Array.isArray(module.state), \`compiler_second_depth_override_module_state:\${ref.company_id}\`);\n    effective.company_overrides[ref.company_id] = cloneJson(module.state);\n  }\n  return effective;\n}\n\n`;
  next = replaceOnce(
    next,
    /function normalizeFlagships\(registry\) \{/,
    `${helper}function normalizeFlagships(registry) {`,
    'effective_second_depth_helper',
  );
  next = replaceOnce(
    next,
    /const index = indexResult\.value;\n      requireValue\(Array\.isArray\(index\.dossier_files\) && index\.dossier_files\.length, 'compiler_dossier_files'\);/,
    "const index = indexResult.value;\n      const effectiveSecondDepth = await loadEffectiveSecondDepth(secondDepthResult.value);\n      requireValue(Array.isArray(index.dossier_files) && index.dossier_files.length, 'compiler_dossier_files');",
    'effective_second_depth_load',
  );
  next = replaceOnce(
    next,
    /const projection = proxy\.compileProjection\(index, shards, secondDepthResult\.value\);/,
    'const projection = proxy.compileProjection(index, shards, effectiveSecondDepth);',
    'effective_second_depth_compile',
  );
  next = replaceOnce(
    next,
    /second_depth: SECOND_DEPTH_PATH,\n      flagship_registry:/,
    'second_depth: SECOND_DEPTH_PATH,\n      second_depth_overrides: SECOND_DEPTH_OVERRIDE_INDEX_PATH,\n      flagship_registry:',
    'effective_second_depth_authority_receipt',
  );

  requireValue(next.includes(helixCommit), 'transformed_compiler_missing_helix_pin');
  requireValue(next.includes('loadEffectiveSecondDepth'), 'transformed_compiler_missing_effective_loader');
  requireValue(next.includes('company_second_depth_overrides/index.json'), 'transformed_compiler_missing_override_index');
  return next;
}

function runNode(args, cwd = ROOT) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`command_failed:${args.join(' ')}`);
  }
  return result.stdout;
}

function main() {
  const { sourceCommit, helixCommit, outputDir } = parseArgs(process.argv);
  const original = fs.readFileSync(COMPILER, 'utf8');
  const transformed = transformCompiler(original, helixCommit);
  try {
    fs.writeFileSync(COMPILER, transformed, 'utf8');
    runNode(['--check', COMPILER]);
    const output = runNode([BUILDER, '--source-commit', sourceCommit, '--output-dir', outputDir]);
    const manifest = JSON.parse(output);
    requireValue(manifest.schema === 'glaciereq.v25-deployment-bundle-manifest.v2', 'effective_bundle_manifest_schema');
    requireValue(manifest.source_commit === sourceCommit, 'effective_bundle_source_commit');
    requireValue(manifest.module_count === 9, 'effective_bundle_module_count');
    requireValue(manifest.invariants?.self_contained_executable_modules === true, 'effective_bundle_self_contained');
    requireValue(manifest.invariants?.runtime_string_evaluation_required === false, 'effective_bundle_runtime_eval');
    requireValue(manifest.invariants?.factory_bundle_verified_before_module_execution === true, 'effective_bundle_factory_verification');
    requireValue(manifest.deployment_files?.length === 2, 'effective_bundle_file_count');
    const bundle = fs.readFileSync(path.join(outputDir, 'api', 'index.js'), 'utf8');
    requireValue(bundle.includes(helixCommit), 'effective_bundle_helix_pin_missing');
    requireValue(bundle.includes('company_second_depth_overrides/index.json'), 'effective_bundle_override_index_missing');
    process.stdout.write(`${JSON.stringify({\n      status: 'PASS',\n      source_commit: sourceCommit,\n      helix_commit: helixCommit,\n      manifest,\n    }, null, 2)}\n`);
  } finally {
    fs.writeFileSync(COMPILER, original, 'utf8');
  }
}

main();
