(() => {
  "use strict";

  const state = {
    graph: null,
    selectedSystem: "job-app-helix",
    constellationDomain: "all",
    storyIndex: 0,
    flowIndex: 0,
    roleIndex: 0
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const svgNS = "http://www.w3.org/2000/svg";

  function slugLabel(value) {
    return String(value || "")
      .replaceAll("-", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function systemById(id) {
    return state.graph.systems.find((system) => system.id === id);
  }

  function create(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function createSvg(tag, attrs = {}) {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function setPressed(buttons, active, attr = "aria-pressed") {
    buttons.forEach((button) => {
      const selected = button === active;
      button.setAttribute(attr, String(selected));
      button.classList.toggle("active", selected);
    });
  }

  async function loadGraph() {
    const response = await fetch("/data/portfolio.graph.json", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Portfolio graph failed: ${response.status}`);
    state.graph = await response.json();
  }

  function initializeTheme() {
    const toggle = $("#themeToggle");
    const saved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const initial = document.documentElement.dataset.theme || saved;
    document.documentElement.dataset.theme = initial;
    toggle.setAttribute("aria-pressed", String(initial === "dark"));
    toggle.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      toggle.setAttribute("aria-pressed", String(next === "dark"));
    });
  }

  function initializeNavigation() {
    const toggle = $("#menuToggle");
    const nav = $("#mobileNav");
    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("open");
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$("a", nav).forEach((link) => link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }));
  }

  function initializeReveal() {
    const elements = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
  }

  function initializeIdentityTilt() {
    const card = $("#identityCard");
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const update = (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateY(${x * 10}deg) rotateX(${y * -10}deg) translateZ(4px)`;
    };
    card.addEventListener("pointermove", update);
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
    card.addEventListener("blur", () => {
      card.style.transform = "";
    });
  }

  function renderCapabilityFamilies() {
    const container = $("#capabilityFamilies");
    state.graph.capability_families.forEach((family, index) => {
      const card = create("article", "capability-card reveal");
      card.dataset.order = String(index + 1).padStart(2, "0");
      card.append(
        create("h3", "", family.name),
        create("p", "", family.promise)
      );
      const list = create("div", "capability-system-list");
      family.systems.forEach((id) => {
        const system = systemById(id);
        if (system) list.append(create("span", "", system.name));
      });
      card.append(list);
      container.append(card);
    });
  }

  const constellationPositions = {
    "job-app-helix": [490, 90],
    "tower-of-babel": [255, 145],
    "agent-coordinator": [725, 145],
    "resume-shapeshifter": [190, 330],
    "recruiter-runtime": [790, 330],
    "psysoc-x": [270, 505],
    "colossus-cooling": [710, 505],
    "echoes": [85, 205],
    "mega-pdf": [90, 465],
    "sigma": [895, 205],
    "fileboss": [890, 465],
    "akos": [490, 585]
  };

  const constellationDomainNames = {
    "job-app-helix": "APPLICATIONS",
    "tower-of-babel": "ARCHITECTURE",
    "agent-coordinator": "AGENTS",
    "resume-shapeshifter": "DOCUMENTS",
    "recruiter-runtime": "PRESENTATION",
    "psysoc-x": "HUMAN",
    "colossus-cooling": "INFRASTRUCTURE",
    "echoes": "MEMORY",
    "mega-pdf": "DOCUMENTS",
    "sigma": "FEDERATION",
    "fileboss": "FILES",
    "akos": "FOUNDATION"
  };

  function renderConstellation() {
    const edgesGroup = $("#constellationEdges");
    const nodesGroup = $("#constellationNodes");
    edgesGroup.textContent = "";
    nodesGroup.textContent = "";

    const center = [490, 300];

    const centerGlow = createSvg("circle", { cx: center[0], cy: center[1], r: 76, fill: "var(--accent-soft)" });
    const centerRing = createSvg("circle", {
      cx: center[0], cy: center[1], r: 61,
      fill: "var(--panel-solid)", stroke: "var(--accent)", "stroke-width": 3
    });
    const centerName = createSvg("text", { x: center[0], y: center[1] - 3, fill: "var(--text)", "text-anchor": "middle", "font-size": 18, "font-weight": 850 });
    centerName.textContent = "CASEY";
    const centerSub = createSvg("text", { x: center[0], y: center[1] + 19, fill: "var(--muted)", "text-anchor": "middle", "font-size": 9, "font-weight": 750, "letter-spacing": ".14em" });
    centerSub.textContent = "BUILDS THE MISSING SYSTEM";
    nodesGroup.append(centerGlow, centerRing, centerName, centerSub);

    state.graph.systems.forEach((system) => {
      const position = constellationPositions[system.id];
      if (!position) return;
      const [x, y] = position;
      const edge = createSvg("path", {
        d: `M ${center[0]} ${center[1]} Q ${(center[0] + x) / 2} ${(center[1] + y) / 2 - 24} ${x} ${y}`,
        class: `constellation-edge${system.foundation_only ? " foundation" : ""}`
      });
      edge.dataset.system = system.id;
      edgesGroup.append(edge);

      const group = createSvg("g", {
        class: `constellation-node${system.public ? "" : " private"}${system.foundation_only ? " foundation" : ""}`,
        role: "button",
        tabindex: "0",
        "aria-label": `${system.name}: ${system.tagline}`,
        transform: `translate(${x} ${y})`
      });
      group.dataset.system = system.id;

      const ring = createSvg("circle", { class: "node-ring", cx: 0, cy: 0, r: system.foundation_only ? 47 : 53 });
      const core = createSvg("circle", { class: "node-core", cx: 0, cy: 0, r: system.foundation_only ? 31 : 36 });
      const label = createSvg("text", { y: -2 });
      const words = system.name.split(" ");
      if (system.name.length > 15 && words.length > 1) {
        const midpoint = Math.ceil(words.length / 2);
        const lineOne = createSvg("tspan", { x: 0, dy: -5 });
        lineOne.textContent = words.slice(0, midpoint).join(" ");
        const lineTwo = createSvg("tspan", { x: 0, dy: 16 });
        lineTwo.textContent = words.slice(midpoint).join(" ");
        label.append(lineOne, lineTwo);
      } else {
        label.textContent = system.name;
      }
      const sub = createSvg("text", { class: "node-sub", y: 27 });
      sub.textContent = constellationDomainNames[system.id] || "SYSTEM";
      group.append(ring, core, label, sub);
      const activate = () => selectConstellationSystem(system.id, true);
      group.addEventListener("click", activate);
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
      nodesGroup.append(group);
    });

    selectConstellationSystem(state.selectedSystem, false);
    applyConstellationFilter();
  }

  function selectConstellationSystem(id, focusDetail) {
    const system = systemById(id);
    if (!system) return;
    state.selectedSystem = id;
    $$(".constellation-node").forEach((node) => node.classList.toggle("selected", node.dataset.system === id));
    $("#detailName").textContent = system.name;
    $("#detailTagline").textContent = system.tagline;
    $("#detailProblem").textContent = system.problem;
    $("#detailMechanism").textContent = system.mechanism;
    $("#detailOutput").textContent = system.output;
    $("#detailMaturity").textContent = slugLabel(system.maturity);
    $("#detailEvidence").textContent = slugLabel(system.evidence_level);
    $("#detailProof").textContent = system.proof_note;
    const link = $("#detailLink");
    if (system.url) {
      link.textContent = "Inspect canonical source";
      link.href = system.url;
      link.target = "_blank";
      link.rel = "noopener";
    } else {
      link.textContent = "Review architecture boundary";
      link.href = "#repository-gallery";
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
    if (focusDetail) $("#constellationDetail").focus?.();
  }

  function applyConstellationFilter() {
    let visible = 0;
    state.graph.systems.forEach((system) => {
      const node = $(`.constellation-node[data-system="${system.id}"]`);
      const edge = $(`.constellation-edge[data-system="${system.id}"]`);
      if (!node) return;
      const show = state.constellationDomain === "all" || system.domains.includes(state.constellationDomain);
      node.classList.toggle("hidden-node", !show);
      if (edge) edge.style.opacity = show ? "" : ".08";
      if (show) visible += 1;
    });
    $("#constellationCount").textContent = `${visible} visible system${visible === 1 ? "" : "s"}`;
  }

  function initializeConstellationFilters() {
    const buttons = $$(".constellation-filter");
    buttons.forEach((button) => button.addEventListener("click", () => {
      state.constellationDomain = button.dataset.domain;
      setPressed(buttons, button);
      applyConstellationFilter();
    }));
  }

  function featuredStories() {
    return state.graph.systems
      .filter((system) => system.featured)
      .sort((a, b) => (a.story_order || 99) - (b.story_order || 99));
  }

  function renderStoryTabs() {
    const tabs = $("#storyTabs");
    featuredStories().forEach((system, index) => {
      const button = create("button", "", `${String(index + 1).padStart(2, "0")} · ${system.name}`);
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(index === state.storyIndex));
      button.addEventListener("click", () => {
        state.storyIndex = index;
        renderStory();
      });
      tabs.append(button);
    });
  }

  function wrapSvgText(text, max = 26) {
    const words = text.split(/\s+/);
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > max && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);
    return lines.slice(0, 4);
  }

  function appendMultilineText(group, text, x, y, className, max = 26, lineHeight = 16) {
    const node = createSvg("text", { x, y, class: className });
    wrapSvgText(text, max).forEach((line, index) => {
      const span = createSvg("tspan", { x, dy: index === 0 ? 0 : lineHeight });
      span.textContent = line;
      node.append(span);
    });
    group.append(node);
  }

  function renderStory() {
    const stories = featuredStories();
    const system = stories[state.storyIndex];
    if (!system) return;

    $$("#storyTabs button").forEach((button, index) => {
      button.setAttribute("aria-selected", String(index === state.storyIndex));
    });
    $("#storyIndex").textContent = `INVENTION STORY ${String(state.storyIndex + 1).padStart(2, "0")}`;
    $("#storyName").textContent = system.name;
    $("#storyTagline").textContent = system.tagline;
    $("#storyInsight").textContent = system.insight;
    $("#storyInnovation").textContent = system.innovation;
    $("#storyRepo").href = system.url;

    const flow = $("#storyFlow");
    flow.textContent = "";

    const stages = [
      ["FAILURE", system.problem],
      ["INSIGHT", system.insight],
      ["MECHANISM", system.mechanism],
      ["OUTPUT", system.output],
      ["PROOF", system.proof_note]
    ];
    const positions = [
      [95, 190],
      [270, 340],
      [450, 165],
      [630, 340],
      [805, 190]
    ];

    positions.slice(0, -1).forEach((position, index) => {
      const next = positions[index + 1];
      const line = createSvg("path", {
        class: "story-line",
        d: `M ${position[0] + 70} ${position[1]} C ${position[0] + 105} ${position[1]}, ${next[0] - 105} ${next[1]}, ${next[0] - 70} ${next[1]}`
      });
      flow.append(line);
    });

    stages.forEach(([label, copy], index) => {
      const [x, y] = positions[index];
      const group = createSvg("g", { class: `story-node${index === 2 ? " featured" : ""}` });
      const rect = createSvg("rect", { x: x - 70, y: y - 70, width: 140, height: 140, rx: 18 });
      const labelNode = createSvg("text", { class: "story-node-label", x, y: y - 40 });
      labelNode.textContent = label;
      group.append(rect, labelNode);
      appendMultilineText(group, copy, x, y - 8, "story-node-copy", 23, 15);
      flow.append(group);
    });
  }

  function initializeStoryNext() {
    $("#storyNext").addEventListener("click", () => {
      state.storyIndex = (state.storyIndex + 1) % featuredStories().length;
      renderStory();
    });
  }

  function renderGallery() {
    const search = $("#gallerySearch").value.trim().toLowerCase();
    const role = $("#galleryRole").value;
    const evidence = $("#galleryEvidence").value;
    const grid = $("#repositoryGrid");
    grid.textContent = "";

    const systems = state.graph.systems.filter((system) => {
      const haystack = [
        system.name, system.tagline, system.problem, system.mechanism,
        system.output, ...(system.domains || []), ...(system.languages || [])
      ].join(" ").toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      const matchesRole = role === "all" || system.roles.includes(role);
      const matchesEvidence =
        evidence === "all" ||
        (evidence === "public" && system.public) ||
        (evidence === "tested" && system.evidence_level === "repository-tested") ||
        (evidence === "private" && !system.public);
      return matchesSearch && matchesRole && matchesEvidence;
    });

    systems.forEach((system) => {
      const card = create("article", `repository-card${system.public ? "" : " private"}`);
      const stateRow = create("div", "repo-state");
      stateRow.append(
        create("span", "", system.public ? "PUBLIC SOURCE" : "PRIVATE ARCHITECTURE"),
        create("span", "", slugLabel(system.maturity))
      );
      const title = create("h3", "", system.name);
      const tagline = create("p", "repo-tagline", system.tagline);
      const problem = create("p", "repo-problem", system.problem);
      const tags = create("div", "repo-tags");
      [...system.domains.slice(0, 2), ...system.languages.slice(0, 2)].forEach((tag) => tags.append(create("span", "", tag)));
      const button = create("button", "button secondary", "Open invention detail");
      button.type = "button";
      button.addEventListener("click", () => openRepositoryDialog(system.id));
      card.append(stateRow, title, tagline, problem, tags, button);
      grid.append(card);
    });

    $("#galleryCount").textContent = `${systems.length} system${systems.length === 1 ? "" : "s"}`;
  }

  function initializeGallery() {
    ["gallerySearch", "galleryRole", "galleryEvidence"].forEach((id) => {
      const element = $(`#${id}`);
      element.addEventListener(id === "gallerySearch" ? "input" : "change", renderGallery);
    });
    $("#galleryReset").addEventListener("click", () => {
      $("#gallerySearch").value = "";
      $("#galleryRole").value = "all";
      $("#galleryEvidence").value = "all";
      renderGallery();
    });
  }

  function openRepositoryDialog(id) {
    const system = systemById(id);
    const dialog = $("#repositoryDialog");
    $("#dialogState").textContent = `${system.public ? "PUBLIC SOURCE" : "PRIVATE ARCHITECTURE"} · ${slugLabel(system.evidence_level)}`;
    $("#dialogName").textContent = system.name;
    $("#dialogTagline").textContent = system.tagline;
    $("#dialogProblem").textContent = system.problem;
    $("#dialogMechanism").textContent = system.mechanism;
    $("#dialogOutput").textContent = system.output;
    $("#dialogProof").textContent = system.proof_note;
    const repo = $("#dialogRepo");
    repo.hidden = !system.url;
    if (system.url) repo.href = system.url;
    $("#dialogConstellation").dataset.system = system.id;
    dialog.showModal();
  }

  function initializeDialog() {
    const dialog = $("#repositoryDialog");
    $("#dialogClose").addEventListener("click", () => dialog.close());
    $("#dialogConstellation").addEventListener("click", (event) => {
      const id = event.currentTarget.dataset.system;
      dialog.close();
      state.constellationDomain = "all";
      const allButton = $('.constellation-filter[data-domain="all"]');
      setPressed($$(".constellation-filter"), allButton);
      applyConstellationFilter();
      selectConstellationSystem(id, false);
      location.hash = "innovation-constellation";
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  function renderFlowTabs() {
    const tabs = $("#flowTabs");
    state.graph.combination_flows.forEach((flow, index) => {
      const button = create("button", "", flow.name);
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(index === state.flowIndex));
      button.addEventListener("click", () => {
        state.flowIndex = index;
        renderFlow();
      });
      tabs.append(button);
    });
  }

  function renderFlow() {
    const flow = state.graph.combination_flows[state.flowIndex];
    $$("#flowTabs button").forEach((button, index) => button.setAttribute("aria-selected", String(index === state.flowIndex)));
    $("#flowName").textContent = flow.name;
    $("#flowDescription").textContent = flow.description;
    const diagram = $("#flowDiagram");
    diagram.textContent = "";

    flow.steps.forEach((step, index) => {
      const system = systemById(step.system);
      const card = create("article", `flow-step${system?.foundation_only ? " foundation-step" : ""}`);
      card.append(
        create("span", "flow-step-index", `STEP ${String(index + 1).padStart(2, "0")}`),
        create("h4", "", system ? system.name : step.system),
        create("p", "", step.label)
      );
      diagram.append(card);
    });
  }

  const evidenceClaims = {
    helix: {
      boundary: "The test record supports repository behavior and package contracts. It does not prove hiring outcomes, recruiter conversion, or production deployment.",
      nodes: [
        ["CLAIM", "Helix coordinates a reproducible application package."],
        ["SOURCE", "job-app-helix canonical package mesh"],
        ["BEHAVIOR", "candidate, application, evidence, and package surfaces"],
        ["TEST", "148/148 recorded repository checks"],
        ["ARTIFACT", "deterministic hire package and manifests"],
        ["VERIFY", "promotion gate and receipt refresh"],
        ["LIMIT", "no hiring-outcome claim"]
      ]
    },
    coordinator: {
      boundary: "The recorded suite supports bounded scheduling at repository scope. Hosted matrix and build-wheel promotion remain pending.",
      nodes: [
        ["CLAIM", "Coordinator uses bounded deterministic scheduling."],
        ["SOURCE", "anthropic-agent-coordinator public repository"],
        ["BEHAVIOR", "ownership, dependencies, budgets, closure states"],
        ["TEST", "62/62 recorded Python 3.13 checks"],
        ["ARTIFACT", "coordination plans and execution records"],
        ["VERIFY", "repository-native test evidence"],
        ["LIMIT", "not production-scale swarm proof"]
      ]
    },
    portfolio: {
      boundary: "The live site proves distinct presentation surfaces. Full source-to-deployment parity and a commit-bound release receipt remain open release gates.",
      nodes: [
        ["CLAIM", "Portfolio exposes human and machine surfaces."],
        ["SOURCE", "job-application source and V13 graph"],
        ["BEHAVIOR", "visual narrative, filters, JSON contracts"],
        ["TEST", "ordered section and contract validation"],
        ["ARTIFACT", "static site plus machine endpoints"],
        ["VERIFY", "browser, route, and digest receipt"],
        ["LIMIT", "deployment parity pending"]
      ]
    }
  };

  function renderEvidenceClaim(id) {
    const claim = evidenceClaims[id];
    const chain = $("#evidenceChain");
    chain.textContent = "";
    claim.nodes.forEach(([label, text]) => {
      const node = create("div", "evidence-node");
      node.append(create("span", "", label), create("strong", "", text));
      chain.append(node);
    });
    $("#evidenceBoundary").textContent = claim.boundary;
  }

  function initializeEvidenceClaims() {
    const buttons = $$(".claim-option");
    buttons.forEach((button) => button.addEventListener("click", () => {
      setPressed(buttons, button);
      renderEvidenceClaim(button.dataset.claim);
    }));
    renderEvidenceClaim("helix");
  }

  function renderRoleTabs() {
    const tabs = $("#roleTabs");
    state.graph.roles.forEach((role, index) => {
      const button = create("button", "", role.name);
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(index === state.roleIndex));
      button.addEventListener("click", () => {
        state.roleIndex = index;
        renderRole();
      });
      tabs.append(button);
    });
  }

  function renderRole() {
    const role = state.graph.roles[state.roleIndex];
    $$("#roleTabs button").forEach((button, index) => button.setAttribute("aria-selected", String(index === state.roleIndex)));
    $("#roleName").textContent = role.name;
    $("#roleSummary").textContent = role.summary;
    const map = $("#roleEvidenceMap");
    map.textContent = "";

    const rows = [
      ...role.primary.map((id) => [id, "Primary evidence", 100]),
      ...role.supporting.map((id) => [id, "Supporting evidence", 66])
    ];
    rows.forEach(([id, label, strength]) => {
      const system = systemById(id);
      if (!system) return;
      const row = create("div", "role-evidence-row");
      row.append(create("strong", "", system.name));
      const track = create("div", "role-track");
      track.style.setProperty("--strength", `${strength}%`);
      track.append(create("span", "", `${label} · ${system.tagline}`));
      row.append(track);
      map.append(row);
    });
  }

  function renderLaws() {
    const grid = $("#lawsGrid");
    state.graph.frontier_laws.forEach((law, index) => {
      const card = create("article", "law-card reveal");
      const head = create("div", "law-card-head");
      head.append(
        create("span", "law-card-index", `LAW ${String(index + 1).padStart(2, "0")}`),
        create("span", "evidence-chip", `${law.derived_from.length} source system${law.derived_from.length === 1 ? "" : "s"}`)
      );
      const title = create("h3", "", slugLabel(law.id));
      const failure = create("p", "law-failure", law.failure);
      const principle = create("p", "law-principle", law.principle);
      const systems = create("div", "law-systems");
      law.derived_from.forEach((id) => {
        const system = systemById(id);
        systems.append(create("span", "", system ? system.name : id));
      });
      card.append(head, title, failure, principle, systems);
      grid.append(card);
    });
  }

  function renderMachineLinks() {
    const container = $("#machineLinks");
    state.graph.machine_interfaces.forEach((item) => {
      const link = create("a", "machine-link");
      link.href = item.href;
      link.append(create("span", "", item.label), create("span", "", item.type));
      container.append(link);
    });
    $("#truthBoundary").textContent = state.graph.truth_boundary;
  }

  function renderAll() {
    renderCapabilityFamilies();
    renderConstellation();
    renderStoryTabs();
    renderStory();
    renderGallery();
    renderFlowTabs();
    renderFlow();
    renderRoleTabs();
    renderRole();
    renderLaws();
    renderMachineLinks();
  }

  async function initialize() {
    initializeTheme();
    initializeNavigation();
    initializeIdentityTilt();
    initializeConstellationFilters();
    initializeStoryNext();
    initializeGallery();
    initializeDialog();
    initializeEvidenceClaims();

    try {
      await loadGraph();
      renderAll();
      initializeReveal();
    } catch (error) {
      console.error(error);
      document.body.classList.add("data-error");
      $("#constellationCount").textContent = "Portfolio graph unavailable";
      initializeReveal();
    }
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
