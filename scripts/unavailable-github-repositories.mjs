// Recruiter-visible GitHub is anonymous HTTP. These GlacierEQ repositories are
// private or unpublished and answer 404 to an anonymous reader, so the public
// site must not present them as links. Keep this list in step with the live
// link check (every github.com/GlacierEQ href on the site must answer 200).
export const UNAVAILABLE_GITHUB_REPOSITORIES = Object.freeze([
  // private
  'AKOS',
  'GlacierEQ_Swarm',
  'Pro-DOCTOR-STRANGE',
  'Pro-comet-agent',
  'apex-cli',
  'apex-control-plane',
  'apex-github-worker',
  'aspen-grove-supabase',
  'colossus-gateway',
  'mega-skills',
  'monolith',
  'notion-mcp-empowerment-engine',
  'perplexity-enhancement-mcp',
  'spiral-engine',
  'xai-colossus-cooling',
  'xai-colossus-energy',
  'xai-colossus-microcode',
  'xai-colossus-nanosphere',
  'xai-colossus-security',
  'xai-colossus-servers',
  // not published
  'nvidia-blackwell-fp4-optimizer',
  'nvidia-cuda-graphs-conditional',
  'nvidia-kernel-autotuner',
  'nvidia-moe-grouped-gemm',
  'nvidia-nvlink-scaler',
  'nvidia-power-perf-profiler',
  'nvidia-tensorrt-llm-tuner',
  'spacex-ai-flight-controller',
  'spacex-engine-out-compensator',
  'spacex-flight-termination-hardener',
  'spacex-hitl-testbed-automation',
  'spacex-in-space-refueling-planner',
  'spacex-stage-separation-optimizer',
  'spacex-starship-flight-software',
]);

const UNAVAILABLE = new Set(UNAVAILABLE_GITHUB_REPOSITORIES.map((name) => name.toLowerCase()));

export function unavailableGithubRepository(url) {
  const match = /^https?:\/\/github\.com\/GlacierEQ\/([A-Za-z0-9._-]+)/i.exec(String(url || '').trim());
  if (!match) return null;
  const name = match[1].replace(/\.git$/i, '');
  return UNAVAILABLE.has(name.toLowerCase()) ? name : null;
}

export function isUnavailableGithubUrl(url) {
  return unavailableGithubRepository(url) !== null;
}
