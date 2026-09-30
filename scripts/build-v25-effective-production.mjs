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
const NUMERIC_CARDINALITY_PIN = /data\.projection\.company_count\s*!==\s*\d+/;
const EXPECTED_BUNDLE_MODULE_COUNT = 13;

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
  next = replaceOnce(next, /const COMPILER_HELIX_COMMIT = '[a-f0-9]{40}';/, `const COMPILER_HELIX_COMMIT = '${helixCommit}';`, 'compiler_helix_pin');
  next = replaceOnce(next, /const SECOND_DEPTH_PATH = 'manifests\/company_second_depth\.json';/, "const SECOND_DEPTH_PATH = 'manifests/company_second_depth.json';\nconst SECOND_DEPTH_OVERRIDE_INDEX_PATH = 'manifests/company_second_depth_overrides/index.json';", 'second_depth_override_index_constant');

  const helper = `function cloneJson(value) {\n  return JSON.parse(JSON.stringify(value));\n}\n\nasync function loadEffectiveSecondDepth(base) {\n  requireValue(base?.authority === 'GlacierEQ/job-app-helix', 'compiler_second_depth_authority');\n  requireValue(base?.company_overrides && typeof base.company_overrides === 'object' && !Array.isArray(base.company_overrides), 'compiler_second_depth_company_overrides');\n  const effective = cloneJson(base);\n  const overrideIndex = (await fetchHelixJson(SECOND_DEPTH_OVERRIDE_INDEX_PATH, 'second_depth_override_index')).value;\n  requireValue(overrideIndex.schema === 'glaciereq.company-second-depth-overrides.v1', 'compiler_second_depth_override_schema');\n  requireValue(overrideIndex.authority === 'GlacierEQ/job-app-helix', 'compiler_second_depth_override_authority');\n  requireValue(overrideIndex.merge_order === 'base_company_second_depth_then_company_module', 'compiler_second_depth_override_merge_order');\n  requireValue(Array.isArray(overrideIndex.overrides), 'compiler_second_depth_override_rows');\n  const seen = new Set();\n  for (const ref of overrideIndex.overrides) {\n    requireValue(ref && typeof ref === 'object' && !Array.isArray(ref), 'compiler_second_depth_override_ref');\n    requireValue(typeof ref.company_id === 'string' && COMPANY_ID.test(ref.company_id), 'compiler_second_depth_override_company_id');\n    requireValue(typeof ref.path === 'string' && ref.path.startsWith('manifests/company_second_depth_overrides/') && ref.path.endsWith('.json'), 'compiler_second_depth_override_path');\n    requireValue(!seen.has(ref.company_id), \`compiler_second_depth_override_duplicate_ref:\${ref.company_id}\`);\n    requireValue(!Object.hasOwn(effective.company_overrides, ref.company_id), \`compiler_second_depth_inline_modular_duplicate:\${ref.company_id}\`);\n    seen.add(ref.company_id);\n    const module = (await fetchHelixJson(ref.path, \`second_depth_override:\${ref.company_id}\`)).value;\n    requireValue(module.schema === 'glaciereq.company-second-depth-company.v1', \`compiler_second_depth_override_module_schema:\${ref.company_id}\`);\n    requireValue(module.company_id === ref.company_id, \`compiler_second_depth_override_module_identity:\${ref.company_id}\`);\n    requireValue(module.state && typeof module.state === 'object' && !Array.isArray(module.state), \`compiler_second_depth_override_module_state:\${ref.company_id}\`);\n    effective.company_overrides[ref.company_id] = cloneJson(module.state);\n  }\n  return effective;\n}\n\n`;
  next = replaceOnce(next, /function normalizeFlagships\(registry\) \{/, `${helper}function normalizeFlagships(registry) {`, 'effective_second_depth_helper');
  next = replaceOnce(next, /const index = indexResult\.value;\n      requireValue\(Array\.isArray\(index\.dossier_files\) && index\.dossier_files\.length, 'compiler_dossier_files'\);/, "const index = indexResult.value;\n      const effectiveSecondDepth = await loadEffectiveSecondDepth(secondDepthResult.value);\n      requireValue(Array.isArray(index.dossier_files) && index.dossier_files.length, 'compiler_dossier_files');", 'effective_second_depth_load');
  next = replaceOnce(next, /const projection = proxy\.compileProjection\(index, shards, secondDepthResult\.value\);/, 'const projection = proxy.compileProjection(index, shards, effectiveSecondDepth);', 'effective_second_depth_compile');
  next = replaceOnce(next, /second_depth: SECOND_DEPTH_PATH,\n      flagship_registry:/, 'second_depth: SECOND_DEPTH_PATH,\n      second_depth_overrides: SECOND_DEPTH_OVERRIDE_INDEX_PATH,\n      flagship_registry:', 'effective_second_depth_authority_receipt');
  next = replaceOnce(next, /if \(data\.projection\.company_count\s*!==\s*\d+\) errors\.push\('compiler_company_count'\);/, "if (!Number.isInteger(data.projection.company_count) || data.projection.company_count < 1) errors.push('compiler_company_count');\n    if (!Array.isArray(data.projection.companies) || data.projection.company_count !== data.projection.companies.length) errors.push('compiler_company_count_mismatch');", 'compiler_company_count_contract');

  const companySurface = `function companySurfaceTarget(filePath) {\n  const match = /^companies\\/([a-z0-9_-]+)\\/(record\\.json|index\\.html)$/.exec(filePath);\n  if (!match) return null;\n  return { slug: match[1], kind: match[2] };\n}\n\nfunction companyForSurface(data, slug) {\n  const normalized = String(slug || '').replaceAll('-', '_');\n  return data.projection.companies.find((row) => row.company_id === slug || row.company_id === normalized) || null;\n}\n\nfunction effectiveCompanyRecord(company) {\n  const repositories = Array.isArray(company.repositories)\n    ? company.repositories.map((row) => typeof row === 'string' ? row : row?.repository).filter(Boolean)\n    : [];\n  return {\n    schema: 'glaciereq.company-intelligence.v1',\n    id: company.company_id,\n    route: \`/companies/\${company.company_id.replaceAll('_', '-')}/\`,\n    state: 'effective_projection',\n    track: company.track_state,\n    roles: Array.isArray(company.target_roles) ? company.target_roles : [],\n    repos: repositories,\n    flagships: Array.isArray(company.applicable_flagships) ? company.applicable_flagships : [],\n    second_depth: company.second_depth,\n    gate: company.second_depth?.next_gate || null,\n    boundary: company.non_affiliation,\n    source: {\n      repository: 'GlacierEQ/job-app-helix',\n      commit: COMPILER_HELIX_COMMIT,\n      second_depth: SECOND_DEPTH_PATH,\n      second_depth_overrides: SECOND_DEPTH_OVERRIDE_INDEX_PATH,\n    },\n  };\n}\n\nasync function serveEffectiveCompanySurface(target, req, res) {\n  const data = await loadCompiler();\n  const company = companyForSurface(data, target.slug);\n  if (!company) return typographyProxy(req, res);\n  if (target.kind === 'record.json') {\n    const body = Buffer.from(\`\${JSON.stringify(effectiveCompanyRecord(company), null, 2)}\\n\`);\n    generatedSecurityHeaders(res);\n    res.statusCode = 200;\n    res.setHeader('Content-Type', 'application/json; charset=utf-8');\n    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');\n    res.setHeader('Content-Length', String(body.length));\n    res.end(body);\n    return;\n  }\n  const roles = Array.isArray(company.target_roles) ? company.target_roles.filter(Boolean) : [];\n  const route = compileRoute(data, { company, role: roles[0] || 'Role route pending', depth: 'company_reviewer' });\n  const body = Buffer.from(compilerHtml(data, route));\n  generatedSecurityHeaders(res);\n  res.statusCode = 200;\n  res.setHeader('Content-Type', 'text/html; charset=utf-8');\n  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');\n  res.setHeader('Content-Length', String(body.length));\n  res.end(body);\n}\n\n`;
  next = replaceOnce(next, /function selected\(value, current\) \{/, `${companySurface}function selected(value, current) {`, 'effective_company_surface_helpers');
  next = replaceOnce(next, /if \(filePath === 'compiler\/index\.html'\) return serveCompilerPage\(req, res(?:, filePath)?\);/, "const companySurface = companySurfaceTarget(filePath);\n  if (companySurface) return serveEffectiveCompanySurface(companySurface, req, res);\n  if (filePath === 'compiler/index.html') return serveCompilerPage(req, res, filePath);", 'effective_company_surface_route');

  requireValue(next.includes(helixCommit), 'transformed_compiler_missing_helix_pin');
  requireValue(next.includes('loadEffectiveSecondDepth'), 'transformed_compiler_missing_effective_loader');
  requireValue(next.includes('company_second_depth_overrides/index.json'), 'transformed_compiler_missing_override_index');
  requireValue(!NUMERIC_CARDINALITY_PIN.test(next), 'transformed_compiler_stale_cardinality_pin');
  requireValue(next.includes('compiler_company_count_mismatch'), 'transformed_compiler_missing_cardinality_consistency');
  requireValue(next.includes('serveEffectiveCompanySurface'), 'transformed_compiler_missing_company_surface');
  requireValue(next.includes("state: 'effective_projection'"), 'transformed_compiler_missing_company_record_state');
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
    requireValue(manifest.module_count === EXPECTED_BUNDLE_MODULE_COUNT, 'effective_bundle_module_count');
    requireValue(manifest.invariants?.self_contained_executable_modules === true, 'effective_bundle_self_contained');
    requireValue(manifest.invariants?.runtime_string_evaluation_required === false, 'effective_bundle_runtime_eval');
    requireValue(manifest.invariants?.factory_bundle_verified_before_module_execution === true, 'effective_bundle_factory_verification');
    requireValue(manifest.deployment_files?.length === 2, 'effective_bundle_file_count');
    const bundle = fs.readFileSync(path.join(outputDir, 'api', 'index.js'), 'utf8');
    requireValue(bundle.includes(helixCommit), 'effective_bundle_helix_pin_missing');
    requireValue(bundle.includes('company_second_depth_overrides/index.json'), 'effective_bundle_override_index_missing');
    requireValue(bundle.includes('compiler_company_count_mismatch'), 'effective_bundle_cardinality_contract_missing');
    requireValue(!NUMERIC_CARDINALITY_PIN.test(bundle), 'effective_bundle_stale_cardinality_pin');
    requireValue(bundle.includes('serveEffectiveCompanySurface'), 'effective_bundle_company_surface_missing');
    requireValue(bundle.includes('V23-SYSTEMS-ATLAS-RESOURCE-GROUNDED'), 'effective_bundle_systems_atlas_missing');
    requireValue(bundle.includes('675b295f6e8c19a85daef50b9ac46bdef224ceea'), 'effective_bundle_systems_atlas_source_missing');
    requireValue(bundle.includes('V28-INVENTION-EVIDENCE-RUNTIME'), 'effective_bundle_invention_runtime_missing');
    requireValue(bundle.includes('e870a5153bb38d533540e44c888759a8cd3b7169'), 'effective_bundle_invention_source_missing');
    requireValue(bundle.includes('V30-PROOF-STARMAP-RUNTIME'), 'effective_bundle_starmap_runtime_missing');
    requireValue(bundle.includes('api/starmap-proxy.js'), 'effective_bundle_starmap_module_missing');
    process.stdout.write(JSON.stringify({ status: 'PASS', source_commit: sourceCommit, helix_commit: helixCommit, manifest }, null, 2) + '\n');
  } finally {
    fs.writeFileSync(COMPILER, original, 'utf8');
  }
}

main();