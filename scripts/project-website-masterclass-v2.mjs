#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "site-v15", "data");

function fail(message) {
  throw new Error(`Website Masterclass projection failed: ${message}`);
}

function requireValue(condition, message) {
  if (!condition) fail(message);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
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

async function loadJson(relative) {
  const file = path.join(ROOT, relative);
  const text = await readFile(file, "utf8");
  const value = JSON.parse(text);
  requireValue(value && typeof value === "object" && !Array.isArray(value), `${relative} must contain an object`);
  return { value, text };
}

async function writeAtomic(relative, value) {
  const file = path.join(ROOT, relative);
  const text = stableJson(value);
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, text, "utf8");
  await rename(temporary, file);
  return sha256(text);
}

function parseReceiptDate(name) {
  const match = name.match(/(20\d{2})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function timelineRecord(name) {
  return {
    id: normalize(name),
    date: parseReceiptDate(name),
    title: name
      .replace(/\.(md|json)$/i, "")
      .replaceAll(/20\d{2}-\d{2}-\d{2}/g, "")
      .replaceAll(/[_-]+/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim(),
    source_path: `deployment-receipts/${name}`,
    source_url: `https://github.com/GlacierEQ/job-application/blob/main/deployment-receipts/${encodeURIComponent(name)}`,
    state: "SOURCE_RECORD_PRESENT",
  };
}

function buildTimeline(names) {
  return names
    .filter((name) => /\.(md|json)$/i.test(name))
    .map(timelineRecord)
    .sort((left, right) => {
      if (left.date && right.date && left.date !== right.date) return right.date.localeCompare(left.date);
      if (left.date && !right.date) return -1;
      if (!left.date && right.date) return 1;
      return left.title.localeCompare(right.title);
    });
}

function legacyProof(portfolio) {
  const proof = new Map();
  for (const row of Array.isArray(portfolio.flagships) ? portfolio.flagships : []) {
    if (!row || typeof row !== "object" || typeof row.repo !== "string") continue;
    if (!row.repo.startsWith("https://github.com/GlacierEQ/")) continue;
    const repository = row.repo.slice("https://github.com/".length).split("/tree/")[0];
    if (/^GlacierEQ\/[A-Za-z0-9_.-]+$/.test(repository)) proof.set(repository, row);
  }
  return proof;
}

function flagshipAliasMap(flagships) {
  const map = new Map();
  for (const flagship of flagships) {
    for (const value of [flagship.system_id, repositoryName(flagship.repository), flagship.role]) {
      const alias = normalize(value);
      if (!alias) continue;
      const existing = map.get(alias);
      if (!existing) map.set(alias, flagship.system_id);
      else if (existing !== flagship.system_id) map.set(alias, null);
    }
  }
  return map;
}

function resolveFlagship(label, aliases) {
  const key = normalize(label);
  if (!key) return null;
  if (aliases.has(key)) return aliases.get(key);
  const matches = [...aliases.entries()]
    .filter(([alias, id]) => id && (key.includes(alias) || alias.includes(key)))
    .sort(([left], [right]) => right.length - left.length);
  if (!matches.length) return null;
  const strongestLength = matches[0][0].length;
  const ids = new Set(matches.filter(([alias]) => alias.length === strongestLength).map(([, id]) => id));
  return ids.size === 1 ? [...ids][0] : null;
}

function addNode(nodes, node) {
  requireValue(typeof node.id === "string" && node.id.length > 0, "graph node id is missing");
  const existing = nodes.get(node.id);
  if (!existing) {
    nodes.set(node.id, node);
    return;
  }
  requireValue(stableJson(existing) === stableJson(node), `graph node identity collision: ${node.id}`);
}

function addRepositoryNode(nodes, repository, evidence) {
  const id = `repository:${repository}`;
  const current = nodes.get(id) ?? {
    id,
    kind: "repository",
    label: repositoryName(repository),
    repository,
    evidence_roles: [],
    levels: [],
    states: [],
    provenance_states: [],
  };
  requireValue(current.kind === "repository" && current.repository === repository, `repository identity collision: ${repository}`);
  for (const [field, value] of [
    ["evidence_roles", evidence.role],
    ["levels", evidence.level],
    ["states", evidence.state],
    ["provenance_states", evidence.provenance],
  ]) {
    if (typeof value === "string" && value.length > 0 && !current[field].includes(value)) current[field].push(value);
    current[field].sort();
  }
  nodes.set(id, current);
  return id;
}

function addEdge(edges, source, target, relationship) {
  requireValue(typeof source === "string" && typeof target === "string" && typeof relationship === "string", "invalid graph edge");
  edges.set(`${source}\u0000${relationship}\u0000${target}`, { source, target, relationship });
}

function companyPresentationState(company) {
  if (company.repositories.length) return "PUBLIC_REPOSITORY_EVIDENCE";
  if (company.applicable_flagships.some((item) => item.system_id)) return "PERSONAL_FLAGSHIP_TRANSFER";
  return "TARGET_TRACK_DISCOVERED_NO_PUBLIC_PROOF_YET";
}

function buildMasterclass(helix, academy, portfolio, receiptNames, sourceHashes) {
  requireValue(helix.schema === "glaciereq.public-portfolio-projection.v1", "unexpected Helix schema");
  requireValue(academy.schema === "glaciereq.infinity-stone-academy.v1", "unexpected Academy schema");
  requireValue(portfolio.schema === "glaciereq.hiring-portfolio.v15", "unexpected portfolio schema");
  requireValue(Array.isArray(helix.companies) && Array.isArray(helix.flagships), "Helix arrays are missing");
  requireValue(Array.isArray(academy.stones), "Academy Stones are missing");

  const oldProof = legacyProof(portfolio);
  const flagships = helix.flagships.map((row) => {
    repositoryName(row.repository);
    const enrichment = oldProof.get(row.repository);
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
  const aliases = flagshipAliasMap(flagships);

  const companies = helix.companies.map((row) => {
    requireValue(typeof row.company_id === "string" && typeof row.display_name === "string", "company identity is missing");
    requireValue(Array.isArray(row.repositories), `${row.company_id}: repositories are invalid`);
    const applicableFlagships = (Array.isArray(row.applicable_flagships) ? row.applicable_flagships : []).map((label) => ({
      label,
      system_id: resolveFlagship(label, aliases),
    }));
    const company = {
      company_id: row.company_id,
      display_name: row.display_name,
      track_state: row.track_state,
      target_roles: Array.isArray(row.target_roles) ? row.target_roles : [],
      recruiter_thesis: row.recruiter_thesis,
      gap_or_next_gate: row.gap_or_next_gate,
      non_affiliation: row.non_affiliation,
      public_repository_count: row.repositories.length,
      repositories: row.repositories.map((repository) => ({
        ...repository,
        repository_url: `https://github.com/${repository.repository}`,
      })),
      applicable_flagships: applicableFlagships,
    };
    company.presentation_state = companyPresentationState(company);
    return company;
  });
  const rank = {
    PUBLIC_REPOSITORY_EVIDENCE: 0,
    PERSONAL_FLAGSHIP_TRANSFER: 1,
    TARGET_TRACK_DISCOVERED_NO_PUBLIC_PROOF_YET: 2,
  };
  companies.sort((left, right) => rank[left.presentation_state] - rank[right.presentation_state]
    || right.public_repository_count - left.public_repository_count
    || left.display_name.localeCompare(right.display_name));

  const nodes = new Map();
  const edges = new Map();
  addNode(nodes, {
    id: "portfolio:casey-barton",
    kind: "portfolio",
    label: portfolio.person?.display_name ?? "Casey Barton",
    positioning: portfolio.person?.positioning ?? null,
  });

  for (const company of companies) {
    const companyId = `company:${company.company_id}`;
    addNode(nodes, {
      id: companyId,
      kind: "company",
      label: company.display_name,
      state: company.presentation_state,
      track_state: company.track_state,
      repository_count: company.public_repository_count,
      boundary: company.non_affiliation,
    });
    addEdge(edges, "portfolio:casey-barton", companyId, "demonstrates-domain-reasoning-for");
    for (const role of company.target_roles) {
      const roleId = `role:${normalize(role)}`;
      addNode(nodes, { id: roleId, kind: "role", label: role });
      addEdge(edges, companyId, roleId, "targets-role");
    }
    for (const repository of company.repositories) {
      const repositoryId = addRepositoryNode(nodes, repository.repository, {
        role: "company-specific-public-system",
        level: repository.level,
        state: repository.promotion_state,
        provenance: repository.provenance_state,
      });
      addEdge(edges, repositoryId, companyId, "addresses-company-bottleneck");
      addEdge(edges, "portfolio:casey-barton", repositoryId, "contains-public-system");
    }
  }

  for (const flagship of flagships) {
    const flagshipId = `flagship:${flagship.system_id}`;
    addNode(nodes, {
      id: flagshipId,
      kind: "flagship",
      label: flagship.proof_story?.name ?? flagship.system_id.replaceAll("_", " "),
      level: flagship.level,
      state: flagship.state,
      role: flagship.role,
      evidence: flagship.evidence,
      next_gate: flagship.next_gate,
    });
    const repositoryId = addRepositoryNode(nodes, flagship.repository, {
      role: "public-flagship",
      level: flagship.level,
      state: flagship.state,
      provenance: "HELIX_PUBLIC_FLAGSHIP",
    });
    addEdge(edges, flagshipId, repositoryId, "implemented-by");
    addEdge(edges, "portfolio:casey-barton", flagshipId, "owns-public-proof-path");
  }

  for (const company of companies) {
    for (const donor of company.applicable_flagships) {
      if (donor.system_id) addEdge(edges, `flagship:${donor.system_id}`, `company:${company.company_id}`, "capability-donor-for");
    }
  }

  for (const stone of academy.stones) {
    const stoneId = `stone:${stone.id}`;
    addNode(nodes, {
      id: stoneId,
      kind: "infinity-stone",
      label: stone.name,
      version: stone.version,
      domain: stone.domain,
      state: stone.status?.public_label,
      core_law: stone.core_law,
    });
    addEdge(edges, "portfolio:casey-barton", stoneId, "uses-governed-specialization");
    for (const skill of stone.skills) {
      const skillId = `skill:${normalize(skill)}`;
      addNode(nodes, { id: skillId, kind: "skill", label: skill });
      addEdge(edges, stoneId, skillId, "provides");
    }
    for (const output of stone.outputs) {
      const outputId = `output:${normalize(output)}`;
      addNode(nodes, { id: outputId, kind: "output", label: output });
      addEdge(edges, stoneId, outputId, "emits");
    }
    for (const compatible of stone.compatible_stones) addEdge(edges, stoneId, `stone:${compatible}`, "compatible-with");
  }

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
    nodes: [...nodes.values()].sort((left, right) => left.id.localeCompare(right.id)),
    edges: [...edges.values()].sort((left, right) => `${left.source}:${left.relationship}:${left.target}`.localeCompare(`${right.source}:${right.relationship}:${right.target}`)),
  };
  graph.snapshot_id = sha256(stableJson(graph));

  const timeline = buildTimeline(receiptNames);
  const proofTrails = flagships.map((flagship) => ({
    ...flagship,
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
      { id: "companies", route: "/companies/", source: "all-company-tracks" },
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
  const [helixRecord, academyRecord, portfolioRecord, receiptNames] = await Promise.all([
    loadJson("site-v15/data/helix-root.json"),
    loadJson("site-v15/data/infinity-stone-academy.json"),
    loadJson("site-v15/data/portfolio.json"),
    readdir(path.join(ROOT, "deployment-receipts")),
  ]);
  const sourceHashes = {
    "site-v15/data/helix-root.json": sha256(helixRecord.text),
    "site-v15/data/infinity-stone-academy.json": sha256(academyRecord.text),
    "site-v15/data/portfolio.json": sha256(portfolioRecord.text),
    "deployment-receipts": sha256(stableJson([...receiptNames].sort())),
  };
  const { projection, graph, proofTrails, timeline } = buildMasterclass(
    helixRecord.value,
    academyRecord.value,
    portfolioRecord.value,
    receiptNames,
    sourceHashes,
  );
  const outputs = {
    "site-v15/data/website-masterclass.json": projection,
    "site-v15/data/experience-graph.json": graph,
    "site-v15/data/proof-trails.json": {
      schema: "glaciereq.website-masterclass-proof-trails.v1",
      source_snapshot_id: graph.snapshot_id,
      trails: proofTrails,
    },
    "site-v15/data/release-timeline.json": {
      schema: "glaciereq.website-masterclass-release-timeline.v1",
      source_snapshot_id: graph.snapshot_id,
      records: timeline,
    },
    "site-v15/data/masterclass-companies.json": {
      schema: "glaciereq.website-masterclass-companies.v1",
      source_snapshot_id: graph.snapshot_id,
      companies: projection.companies,
    },
    "site-v15/data/masterclass-flagships.json": {
      schema: "glaciereq.website-masterclass-flagships.v1",
      source_snapshot_id: graph.snapshot_id,
      flagships: projection.flagships,
    },
  };
  const outputHashes = {};
  for (const [relative, value] of Object.entries(outputs)) outputHashes[relative] = await writeAtomic(relative, value);
  const receipt = {
    schema: "glaciereq.website-masterclass-projection-receipt.v1",
    snapshot_id: graph.snapshot_id,
    sources: sourceHashes,
    outputs: outputHashes,
    counts: projection.counts,
    status: "PASS",
  };
  await writeAtomic("site-v15/data/website-masterclass.receipt.json", receipt);
  console.log(`Website Masterclass projected: snapshot=${graph.snapshot_id}`);
  console.log(`companies=${projection.counts.company_tracks} flagships=${projection.counts.public_flagships} stones=${projection.counts.infinity_stones}`);
  console.log(`graph_nodes=${projection.counts.graph_nodes} graph_edges=${projection.counts.graph_edges}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
