#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site-v15");
const DATA = path.join(SITE, "data");
const HELIX = path.join(DATA, "helix-root.json");
const ACADEMY = path.join(DATA, "infinity-stone-academy.json");
const PORTFOLIO = path.join(DATA, "portfolio.json");
const RECEIPTS = path.join(ROOT, "deployment-receipts");

function fail(message) {
  throw new Error(`Website Masterclass projection failed: ${message}`);
}

function requireValue(condition, message) {
  if (!condition) fail(message);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function repositoryName(repository) {
  requireValue(typeof repository === "string" && /^GlacierEQ\/[A-Za-z0-9_.-]+$/.test(repository), `invalid repository ${String(repository)}`);
  return repository.slice("GlacierEQ/".length);
}

async function loadJson(file, label) {
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    fail(`${label} cannot be read: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    const value = JSON.parse(text);
    requireValue(value && typeof value === "object" && !Array.isArray(value), `${label} must contain an object`);
    return { value, text };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Website Masterclass projection failed:")) throw error;
    fail(`${label} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function writeAtomic(file, value) {
  const text = stableJson(value);
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, text, "utf8");
  await rename(temporary, file);
  return sha256(text);
}

function addNode(nodes, node) {
  requireValue(typeof node.id === "string" && node.id.length > 0, "graph node id is missing");
  const existing = nodes.get(node.id);
  if (existing) {
    requireValue(stableJson(existing) === stableJson(node), `graph node identity collision: ${node.id}`);
    return;
  }
  nodes.set(node.id, node);
}

function addEdge(edges, edge) {
  requireValue(typeof edge.source === "string" && typeof edge.target === "string", "graph edge endpoints are invalid");
  requireValue(typeof edge.relationship === "string" && edge.relationship.length > 0, "graph edge relationship is missing");
  edges.set(`${edge.source}\u0000${edge.relationship}\u0000${edge.target}`, edge);
}

function parseReceiptDate(name) {
  const match = name.match(/(20\d{2})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function humanizeReceipt(name) {
  return name
    .replace(/\.(md|json)$/i, "")
    .replaceAll(/20\d{2}-\d{2}-\d{2}/g, "")
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function buildTimeline(receiptNames) {
  return receiptNames
    .filter((name) => /\.(md|json)$/i.test(name))
    .map((name) => ({
      id: normalize(name),
      date: parseReceiptDate(name),
      title: humanizeReceipt(name),
      source_path: `deployment-receipts/${name}`,
      source_url: `https://github.com/GlacierEQ/job-application/blob/main/deployment-receipts/${encodeURIComponent(name)}`,
      state: "SOURCE_RECORD_PRESENT",
    }))
    .sort((a, b) => {
      if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return a.title.localeCompare(b.title);
    });
}

function legacyProofByRepository(portfolio) {
  const map = new Map();
  for (const row of Array.isArray(portfolio.flagships) ? portfolio.flagships : []) {
    if (!row || typeof row !== "object" || typeof row.repo !== "string") continue;
    const prefix = "https://github.com/";
    if (!row.repo.startsWith(prefix)) continue;
    const repository = row.repo.slice(prefix.length).split("/tree/", 1)[0];
    if (/^GlacierEQ\/[A-Za-z0-9_.-]+$/.test(repository)) map.set(repository, row);
  }
  return map;
}

function flagshipAliases(flagships) {
  const aliases = new Map();
  for (const flagship of flagships) {
    const values = new Set([
      normalize(flagship.system_id),
      normalize(flagship.system_id.replaceAll("_", " ")),
      normalize(repositoryName(flagship.repository)),
      normalize(flagship.role),
    ]);
    for (const value of values) {
      if (!value) continue;
      const current = aliases.get(value);
      requireValue(!current || current === flagship.system_id, `ambiguous flagship alias ${value}`);
      aliases.set(value, flagship.system_id);
    }
  }
  return aliases;
}

function resolveApplicableFlagship(value, aliases) {
  const normalized = normalize(value);
  if (!normalized) return null;
  if (aliases.has(normalized)) return aliases.get(normalized);
  const candidates = [...aliases.entries()]
    .filter(([alias]) => normalized.includes(alias) || alias.includes(normalized))
    .sort(([left], [right]) => right.length - left.length);
  if (!candidates.length) return null;
  const strongestLength = candidates[0][0].length;
  const strongest = new Set(candidates.filter(([alias]) => alias.length === strongestLength).map(([, id]) => id));
  return strongest.size === 1 ? [...strongest][0] : null;
}

function buildProjection(helix, academy, portfolio, receiptNames, sourceHashes) {
  requireValue(helix.schema === "glaciereq.public-portfolio-projection.v1", "unexpected Helix public projection schema");
  requireValue(academy.schema === "glaciereq.infinity-stone-academy.v1", "unexpected Academy schema");
  requireValue(portfolio.schema === "glaciereq.hiring-portfolio.v15", "unexpected portfolio schema");
  requireValue(Array.isArray(helix.companies), "Helix company projection is missing");
  requireValue(Array.isArray(helix.flagships), "Helix flagship projection is missing");
  requireValue(Array.isArray(academy.stones), "Academy Stone projection is missing");

  const legacyProof = legacyProofByRepository(portfolio);
  const flagships = helix.flagships.map((row) => {
    repositoryName(row.repository);
    const enrichment = legacyProof.get(row.repository);
    return {
      system_id: row.system_id,
      repository: row.repository,
      repository_url: `https://github.com/${row.repository}`,
      level: row.level,
      state: row.state,
      role: row.role,
      evidence: row.evidence,
      next_gate: row.next_gate,
      public_surface: row.public_surface,
      proof_story: enrichment
        ? {
            name: enrichment.name,
            label: enrichment.label,
            summary: enrichment.summary,
            mechanism: enrichment.mechanism,
            limit: enrichment.limit,
          }
        : null,
    };
  });
  const aliases = flagshipAliases(flagships);

  const companies = helix.companies
    .map((company) => {
      requireValue(typeof company.company_id === "string" && company.company_id.length > 0, "company_id is missing");
      requireValue(typeof company.display_name === "string" && company.display_name.length > 0, `${company.company_id}: display_name is missing`);
      requireValue(Array.isArray(company.repositories), `${company.company_id}: repositories are invalid`);
      const applicable = Array.isArray(company.applicable_flagships)
        ? company.applicable_flagships.map((value) => ({
            label: value,
            system_id: resolveApplicableFlagship(value, aliases),
          }))
        : [];
      return {
        company_id: company.company_id,
        display_name: company.display_name,
        track_state: company.track_state,
        target_roles: Array.isArray(company.target_roles) ? company.target_roles : [],
        recruiter_thesis: company.recruiter_thesis,
        gap_or_next_gate: company.gap_or_next_gate,
        non_affiliation: company.non_affiliation,
        public_repository_count: company.repositories.length,
        repositories: company.repositories.map((repository) => ({
          ...repository,
          repository_url: `https://github.com/${repository.repository}`,
        })),
        applicable_flagships: applicable,
        presentation_state:
          company.repositories.length > 0
            ? "PUBLIC_REPOSITORY_EVIDENCE"
            : applicable.some((item) => item.system_id)
              ? "PERSONAL_FLAGSHIP_TRANSFER"
              : "TARGET_TRACK_DISCOVERED_NO_PUBLIC_PROOF_YET",
      };
    })
    .sort((a, b) => {
      const stateRank = {
        PUBLIC_REPOSITORY_EVIDENCE: 0,
        PERSONAL_FLAGSHIP_TRANSFER: 1,
        TARGET_TRACK_DISCOVERED_NO_PUBLIC_PROOF_YET: 2,
      };
      return stateRank[a.presentation_state] - stateRank[b.presentation_state]
        || b.public_repository_count - a.public_repository_count
        || a.display_name.localeCompare(b.display_name);
    });

  const nodes = new Map();
  const edges = new Map();
  addNode(nodes, {
    id: "portfolio:casey-barton",
    kind: "portfolio",
    label: portfolio.person?.display_name ?? "Casey Barton",
    positioning: portfolio.person?.positioning ?? null,
  });

  for (const company of companies) {
    const companyNode = `company:${company.company_id}`;
    addNode(nodes, {
      id: companyNode,
      kind: "company",
      label: company.display_name,
      state: company.presentation_state,
      track_state: company.track_state,
      repository_count: company.public_repository_count,
      boundary: company.non_affiliation,
    });
    addEdge(edges, {
      source: "portfolio:casey-barton",
      target: companyNode,
      relationship: "demonstrates-domain-reasoning-for",
    });
    for (const role of company.target_roles) {
      const roleNode = `role:${normalize(role)}`;
      addNode(nodes, { id: roleNode, kind: "role", label: role });
      addEdge(edges, { source: companyNode, target: roleNode, relationship: "targets-role" });
    }
    for (const repository of company.repositories) {
      const repoNode = `repository:${repository.repository}`;
      addNode(nodes, {
        id: repoNode,
        kind: "repository",
        label: repositoryName(repository.repository),
        repository: repository.repository,
        level: repository.level,
        state: repository.promotion_state,
        provenance_state: repository.provenance_state,
      });
      addEdge(edges, { source: repoNode, target: companyNode, relationship: "addresses-company-bottleneck" });
      addEdge(edges, { source: "portfolio:casey-barton", target: repoNode, relationship: "contains-public-system" });
    }
  }

  for (const flagship of flagships) {
    const flagshipNode = `flagship:${flagship.system_id}`;
    const repoNode = `repository:${flagship.repository}`;
    addNode(nodes, {
      id: flagshipNode,
      kind: "flagship",
      label: flagship.proof_story?.name ?? flagship.system_id.replaceAll("_", " "),
      level: flagship.level,
      state: flagship.state,
      role: flagship.role,
      evidence: flagship.evidence,
      next_gate: flagship.next_gate,
    });
    addNode(nodes, {
      id: repoNode,
      kind: "repository",
      label: repositoryName(flagship.repository),
      repository: flagship.repository,
      level: flagship.level,
      state: flagship.state,
      provenance_state: "HELIX_PUBLIC_FLAGSHIP",
    });
    addEdge(edges, { source: flagshipNode, target: repoNode, relationship: "implemented-by" });
    addEdge(edges, { source: "portfolio:casey-barton", target: flagshipNode, relationship: "owns-public-proof-path" });
  }

  for (const company of companies) {
    for (const applicable of company.applicable_flagships) {
      if (!applicable.system_id) continue;
      addEdge(edges, {
        source: `flagship:${applicable.system_id}`,
        target: `company:${company.company_id}`,
        relationship: "capability-donor-for",
      });
    }
  }

  for (const stone of academy.stones) {
    const stoneNode = `stone:${stone.id}`;
    addNode(nodes, {
      id: stoneNode,
      kind: "infinity-stone",
      label: stone.name,
      version: stone.version,
      domain: stone.domain,
      state: stone.status?.public_label,
      core_law: stone.core_law,
    });
    addEdge(edges, { source: "portfolio:casey-barton", target: stoneNode, relationship: "uses-governed-specialization" });
    for (const skill of stone.skills) {
      const skillNode = `skill:${normalize(skill)}`;
      addNode(nodes, { id: skillNode, kind: "skill", label: skill });
      addEdge(edges, { source: stoneNode, target: skillNode, relationship: "provides" });
    }
    for (const output of stone.outputs) {
      const outputNode = `output:${normalize(output)}`;
      addNode(nodes, { id: outputNode, kind: "output", label: output });
      addEdge(edges, { source: stoneNode, target: outputNode, relationship: "emits" });
    }
    for (const compatible of stone.compatible_stones) {
      addEdge(edges, { source: stoneNode, target: `stone:${compatible}`, relationship: "compatible-with" });
    }
  }

  const timeline = buildTimeline(receiptNames);
  const graph = {
    schema: "glaciereq.website-masterclass-experience-graph.v1",
    source: {
      helix_commit: helix.source?.root_ref,
      helix_digest: helix.source?.source_digest,
      akos_commit: academy.source?.commit,
      akos_digest: academy.source?.source_digest,
      source_hashes: sourceHashes,
    },
    truth_boundary: {
      presentation_is_not_evidence: true,
      company_alignment_is_not_affiliation: true,
      repository_presence_is_not_runtime_proof: true,
      candidate_stones_remain_candidate: true,
      owning_repositories_retain_evidence_authority: true,
    },
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => `${a.source}:${a.relationship}:${a.target}`.localeCompare(`${b.source}:${b.relationship}:${b.target}`)),
  };
  graph.snapshot_id = sha256(stableJson(graph));

  const proofTrails = flagships.map((flagship) => ({
    system_id: flagship.system_id,
    repository: flagship.repository,
    repository_url: flagship.repository_url,
    level: flagship.level,
    state: flagship.state,
    role: flagship.role,
    evidence: flagship.evidence,
    next_gate: flagship.next_gate,
    proof_story: flagship.proof_story,
    authority: "OWNING_REPOSITORY_AND_HELIX_ADMISSION_RECORD",
  }));

  const projection = {
    schema: "glaciereq.website-masterclass.v1",
    release_state: "CANDIDATE_SOURCE_PROJECTION_UNTIL_BRANCH_VALIDATION_AND_PREVIEW_PASS",
    source: graph.source,
    snapshot_id: graph.snapshot_id,
    counts: {
      company_tracks: companies.length,
      company_tracks_with_public_repositories: companies.filter((company) => company.public_repository_count > 0).length,
      public_company_repository_memberships: companies.reduce((sum, company) => sum + company.public_repository_count, 0),
      public_flagships: flagships.length,
      infinity_stones: academy.stones.length,
      graph_nodes: graph.nodes.length,
      graph_edges: graph.edges.length,
      release_records: timeline.length,
    },
    four_surfaces: [
      { id: "recruiter", route: "/", purpose: "Fast role fit, strongest proof, clear boundaries." },
      { id: "master", route: "/master/", purpose: "Complete architecture, proof trails, limits, and gates." },
      { id: "machine", route: "/machine/", purpose: "Schema-bound snapshots, source digests, and deterministic graph data." },
      { id: "mesh", route: "/mesh/", purpose: "Company, repository, flagship, capability-donor, and Stone relationships." },
    ],
    experience_routes: [
      { id: "atlas", route: "/atlas/", source: "companies+flagships" },
      { id: "constellation", route: "/constellation/", source: "experience-graph" },
      { id: "proof", route: "/proof/", source: "proof-trails" },
      { id: "timeline", route: "/timeline/", source: "deployment-receipts" },
      { id: "academy", route: "/academy/", source: "AKOS" },
    ],
    companies,
    flagships,
    proof_trails: proofTrails,
    timeline,
    academy: {
      source: academy.source,
      four_layer_contract: academy.four_layer_contract,
      prior_verified_baseline: academy.prior_verified_baseline,
      stones: academy.stones,
      upgrades: academy.upgrades,
      gauntlets: academy.gauntlets,
      planned: academy.planned,
    },
    truth_boundary: graph.truth_boundary,
  };

  return { projection, graph, proofTrails, timeline };
}

async function main() {
  const [{ value: helix, text: helixText }, { value: academy, text: academyText }, { value: portfolio, text: portfolioText }, receiptNames] = await Promise.all([
    loadJson(HELIX, "Helix public projection"),
    loadJson(ACADEMY, "Infinity Stone Academy"),
    loadJson(PORTFOLIO, "current portfolio enrichment"),
    readdir(RECEIPTS),
  ]);
  const sourceHashes = {
    "site-v15/data/helix-root.json": sha256(helixText),
    "site-v15/data/infinity-stone-academy.json": sha256(academyText),
    "site-v15/data/portfolio.json": sha256(portfolioText),
    "deployment-receipts": sha256(stableJson([...receiptNames].sort())),
  };
  const { projection, graph, proofTrails, timeline } = buildProjection(
    helix,
    academy,
    portfolio,
    receiptNames,
    sourceHashes,
  );

  const outputs = {
    "website-masterclass.json": projection,
    "experience-graph.json": graph,
    "proof-trails.json": {
      schema: "glaciereq.website-masterclass-proof-trails.v1",
      source_snapshot_id: graph.snapshot_id,
      trails: proofTrails,
    },
    "release-timeline.json": {
      schema: "glaciereq.website-masterclass-release-timeline.v1",
      source_snapshot_id: graph.snapshot_id,
      records: timeline,
    },
    "masterclass-companies.json": {
      schema: "glaciereq.website-masterclass-companies.v1",
      source_snapshot_id: graph.snapshot_id,
      companies: projection.companies,
    },
    "masterclass-flagships.json": {
      schema: "glaciereq.website-masterclass-flagships.v1",
      source_snapshot_id: graph.snapshot_id,
      flagships: projection.flagships,
    },
  };

  const outputHashes = {};
  for (const [name, value] of Object.entries(outputs)) {
    outputHashes[`site-v15/data/${name}`] = await writeAtomic(path.join(DATA, name), value);
  }
  const receipt = {
    schema: "glaciereq.website-masterclass-projection-receipt.v1",
    snapshot_id: graph.snapshot_id,
    sources: sourceHashes,
    outputs: outputHashes,
    counts: projection.counts,
    status: "PASS",
  };
  await writeAtomic(path.join(DATA, "website-masterclass.receipt.json"), receipt);

  console.log(`Website Masterclass projected: snapshot=${graph.snapshot_id}`);
  console.log(`companies=${projection.counts.company_tracks} flagships=${projection.counts.public_flagships} stones=${projection.counts.infinity_stones}`);
  console.log(`graph_nodes=${projection.counts.graph_nodes} graph_edges=${projection.counts.graph_edges}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
