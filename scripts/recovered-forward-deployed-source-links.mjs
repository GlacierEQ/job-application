// Evidence recovery for historic, non-existent standalone repo identities.
// This is NOT a portfolio membership list: it only resolves known legacy
// broken links to their actual, immutable original source implementations.
const HELIX_SOURCE_SHA = '8dfcc29cb21886fa0486204ff1b5e2d7fc91bde9';

const BUNDLED_CAPABILITIES = {
  spacex: new Set([
    'spacex-starship-flight-software', 'spacex-ai-flight-controller',
    'spacex-engine-out-compensator', 'spacex-stage-separation-optimizer',
    'spacex-flight-termination-hardener', 'spacex-hitl-testbed-automation',
    'spacex-in-space-refueling-planner',
  ]),
  nvidia: new Set([
    'nvidia-blackwell-fp4-optimizer', 'nvidia-cuda-graphs-conditional',
    'nvidia-moe-grouped-gemm', 'nvidia-nvlink-scaler',
    'nvidia-tensorrt-llm-tuner', 'nvidia-kernel-autotuner',
    'nvidia-power-perf-profiler',
  ]),
};

export function recoveredForwardDeployedSource(repositoryName) {
  const identity = String(repositoryName ?? '').toLowerCase();
  for (const [family, names] of Object.entries(BUNDLED_CAPABILITIES)) {
    if (names.has(identity)) {
      return {
        family,
        url: `https://github.com/GlacierEQ/job-app-helix/blob/${HELIX_SOURCE_SHA}/src/job_app_helix/forward_deployed/${family}/__init__.py`,
      };
    }
  }
  return null;
}

export function rewriteForwardDeployedSourceAnchors(html) {
  return String(html).replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (original, attributes, label) => {
    const match = attributes.match(/\bhref=(["'])(https:\/\/github\.com\/GlacierEQ\/([A-Za-z0-9._-]+)(?:\/[^"']*)?)\1/i);
    if (!match) return original;
    const source = recoveredForwardDeployedSource(match[3]);
    if (!source) return original;
    const safeAttributes = attributes.replace(match[0], `href="${source.url}"`);
    const labelWithoutFalseClaim = label.replace(/Inspect canonical repository/gi, 'Inspect bundled implementation');
    const explanation = `<span class="source-provenance"> · ${match[3]}: Bundled source; standalone repository not published</span>`;
    return `<a${safeAttributes}>${labelWithoutFalseClaim}${explanation}</a>`;
  });
}

/**
 * Public, source-backed capability identities are evidence projections,
 * NOT standalone repository membership and NOT a publication cap.
 * Adding a validated source identity to the lineage registry automatically
 * extends the company dossier and its machine-readable companion.
 */
export function sourceBackedCapabilitiesForCompany(companyId) {
  const family = String(companyId || '').toLowerCase();
  const names = BUNDLED_CAPABILITIES[family];
  if (!names) return [];
  return [...names].map((name) => ({
    name,
    family,
    evidence_state: 'SOURCE_CODE_PRESENT_RUNTIME_NOT_VERIFIED',
    standalone_repository_state: 'NOT_PUBLISHED',
    source_repository: 'GlacierEQ/job-app-helix',
    source_commit: HELIX_SOURCE_SHA,
    source_url: recoveredForwardDeployedSource(name).url,
  }));
}
