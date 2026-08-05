(() => {
  "use strict";

  const ENDPOINT = "/api/estate";
  const FALLBACK = "/data/estate.authority.json";
  const state = {
    data: null,
    mode: "companies",
    query: "",
    disposition: "all",
    visible: 80,
    degraded: false
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function label(value) {
    return String(value || "")
      .toLowerCase()
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function number(value) {
    return new Intl.NumberFormat("en-US").format(Number(value || 0));
  }

  function addStylesheet() {
    if ($('link[href="/assets/estate.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/estate.css";
    document.head.append(link);
  }

  function addNavigationLink(nav, beforeSelector) {
    if (!nav || $('a[href="#system-estate"]', nav)) return;
    const link = create("a", "", "System estate");
    link.href = "#system-estate";
    const before = beforeSelector ? $(beforeSelector, nav) : null;
    if (before) nav.insertBefore(link, before);
    else nav.append(link);
  }

  function patchNavigation() {
    addNavigationLink($(".desktop-nav"), 'a[href="#evidence-demonstrations"]');
    addNavigationLink($("#mobileNav"), 'a[href="#evidence-demonstrations"]');
    const explore = $$(".site-footer strong").find((node) => node.textContent.trim() === "Explore")?.parentElement;
    addNavigationLink(explore, 'a[href="#repository-gallery"]');
  }

  function buildMetric(id, labelText, detail) {
    const card = create("article", "estate-metric");
    const value = create("strong", "", "—");
    value.id = id;
    card.append(value, create("span", "", labelText), create("p", "", detail));
    return card;
  }

  function buildSection() {
    if ($("#system-estate")) return;
    const anchor = $("#repository-gallery");
    if (!anchor) return;

    const section = create("section", "section estate-section section-indexed");
    section.id = "system-estate";
    section.dataset.section = "06";

    const shell = create("div", "shell");
    const heading = create("div", "section-heading reveal");
    const titleWrap = create("div");
    titleWrap.append(
      create("p", "kicker", "FULL SYSTEM ESTATE"),
      create("h2", "", "Not a handful of favorite repositories. The whole build history organized as connected systems.")
    );
    heading.append(
      titleWrap,
      create("p", "", "Every live repository receives a lifecycle disposition and capability record. Public source is inspectable by name; private components remain counted inside the systems they support; sensitive casework is quarantined from this public surface.")
    );

    const metrics = create("div", "estate-metrics reveal");
    metrics.append(
      buildMetric("estateLive", "live repositories", "The current authenticated GitHub boundary."),
      buildMetric("estateRecovered", "recovered beyond the old baseline", "Repositories previously absent from the application map."),
      buildMetric("estateCompanies", "company systems", "Direct company families plus typed capability alignment."),
      buildMetric("estateCapabilities", "capability systems", "The reusable architecture tying repositories together."),
      buildMetric("estateUnresolved", "explicit review queue", "Visible unknowns awaiting deeper semantic source review."),
      buildMetric("estateOmissions", "silent omissions", "A fail-closed validator requires this to remain zero.")
    );

    const controls = create("div", "estate-controls reveal");
    const tabs = create("div", "estate-tabs");
    tabs.setAttribute("role", "tablist");
    [
      ["companies", "Company systems"],
      ["capabilities", "Capability systems"],
      ["repositories", "Public repositories"],
      ["private", "Private contribution"]
    ].forEach(([mode, text], index) => {
      const button = create("button", index === 0 ? "active" : "", text);
      button.type = "button";
      button.dataset.estateMode = mode;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(index === 0));
      tabs.append(button);
    });

    const filters = create("div", "estate-filters");
    const searchLabel = create("label");
    searchLabel.append(create("span", "", "Search the estate"));
    const search = create("input");
    search.id = "estateSearch";
    search.type = "search";
    search.placeholder = "Company, capability, repository, or system family";
    searchLabel.append(search);

    const dispositionLabel = create("label");
    dispositionLabel.append(create("span", "", "Lifecycle"));
    const select = create("select");
    select.id = "estateDisposition";
    ["all", "PROMOTE", "HARDEN", "REBUILD", "REFERENCE"].forEach((value) => {
      const option = create("option", "", value === "all" ? "All lifecycle states" : label(value));
      option.value = value;
      select.append(option);
    });
    dispositionLabel.append(select);
    filters.append(searchLabel, dispositionLabel);
    controls.append(tabs, filters);

    const status = create("div", "estate-status reveal");
    status.append(
      create("span", "", "Loading authenticated estate authority…"),
      create("span", "estate-audit-state", "VALIDATION PENDING")
    );
    status.id = "estateStatus";

    const content = create("div", "estate-content reveal");
    content.id = "estateContent";

    const boundary = create("div", "estate-boundary reveal");
    boundary.id = "estateBoundary";
    boundary.append(
      create("strong", "", "Public truth boundary"),
      create("p", "", "Loading the estate authority and privacy boundary."),
      create("code", "", "audit: pending")
    );

    shell.append(heading, metrics, controls, status, content, boundary);
    section.append(shell);
    anchor.after(section);

    const galleryHeading = $("#repository-gallery .section-heading h2");
    const galleryCopy = $("#repository-gallery .section-heading > p");
    if (galleryHeading) galleryHeading.textContent = "Curated entry points into a much larger system estate.";
    if (galleryCopy) galleryCopy.textContent = "These cards are the strongest narrative entry points. The complete estate, including every public repository and private-system contribution, is mapped immediately below.";
  }

  function renderMetrics(summary) {
    const values = {
      estateLive: summary.live_repositories,
      estateRecovered: summary.recovered_beyond_old_baseline,
      estateCompanies: summary.company_systems,
      estateCapabilities: summary.capability_systems,
      estateUnresolved: summary.unresolved_relevance,
      estateOmissions: summary.silent_omissions
    };
    Object.entries(values).forEach(([id, value]) => {
      const node = $(`#${id}`);
      if (node) node.textContent = number(value);
    });

    const identity = $$(".identity-strip span");
    if (identity.length >= 3) {
      identity[0].replaceChildren(create("b", "", number(summary.live_repositories)), document.createTextNode(" live repositories"));
      identity[1].replaceChildren(create("b", "", number(summary.company_systems)), document.createTextNode(" connected company systems"));
      identity[2].replaceChildren(create("b", "", number(summary.silent_omissions)), document.createTextNode(" silent omissions"));
    }
  }

  function stat(labelText, value) {
    const item = create("div", "estate-card-stat");
    item.append(create("span", "", labelText), create("strong", "", number(value)));
    return item;
  }

  function lifecycleBar(item) {
    const total = Math.max(1, Number(item.member_repository_count || 0));
    const bar = create("div", "estate-lifecycle-bar");
    [
      ["promote", item.promote_count],
      ["harden", item.harden_count],
      ["rebuild", item.rebuild_count],
      ["reference", item.reference_count]
    ].forEach(([name, value]) => {
      const segment = create("span", `estate-segment ${name}`);
      segment.style.width = `${(Number(value || 0) / total) * 100}%`;
      segment.title = `${label(name)}: ${number(value)}`;
      bar.append(segment);
    });
    return bar;
  }

  function renderCompanies() {
    const query = state.query;
    const rows = (state.data.company_systems || []).filter((item) => {
      const haystack = `${item.display_name} ${item.employer_id}`.toLowerCase();
      return !query || haystack.includes(query);
    });
    const grid = create("div", "estate-company-grid");
    rows.forEach((item) => {
      const card = create("article", "estate-system-card");
      const heading = create("div", "estate-card-heading");
      heading.append(
        create("span", "estate-card-kicker", item.direct_repository_count > 0 ? "DIRECT + SYSTEM ALIGNMENT" : "CAPABILITY SYSTEM ALIGNMENT"),
        create("h3", "", item.display_name)
      );
      const stats = create("div", "estate-card-stats");
      stats.append(
        stat("total members", item.member_repository_count),
        stat("direct signals", item.direct_repository_count),
        stat("recovered", item.recovered_beyond_old_baseline_count),
        stat("family clusters", item.family_cluster_count)
      );
      const note = create("p", "estate-card-note", `${number(item.harden_count)} harden · ${number(item.rebuild_count)} rebuild · ${number(item.reference_count)} reference. Capability alignment is evidence of technical relevance, not employment or affiliation.`);
      card.append(heading, lifecycleBar(item), stats, note);
      grid.append(card);
    });
    return [grid, `${number(rows.length)} company systems`];
  }

  function renderCapabilities() {
    const query = state.query;
    const rows = (state.data.capability_systems || []).filter((item) => {
      const haystack = `${item.display_name} ${item.capability_id}`.toLowerCase();
      return !query || haystack.includes(query);
    });
    const grid = create("div", "estate-capability-grid");
    rows.forEach((item) => {
      const card = create("article", "estate-capability-card");
      card.append(
        create("span", "estate-card-kicker", item.capability_id),
        create("h3", "", item.display_name),
        create("strong", "estate-capability-total", `${number(item.member_repository_count)} repositories`)
      );
      const stats = create("div", "estate-card-stats compact");
      stats.append(
        stat("name signals", item.name_signal_count),
        stat("curated identities", item.curated_identity_count),
        stat("manual authority", item.manual_authority_count),
        stat("family propagation", item.family_propagated_count)
      );
      card.append(stats, create("p", "estate-card-note", `${number(item.recovered_beyond_old_baseline_count)} members were absent from the old application baseline.`));
      grid.append(card);
    });
    return [grid, `${number(rows.length)} capability systems`];
  }

  function repoMatches(repo) {
    const query = state.query;
    const disposition = state.disposition;
    const haystack = [
      repo.name,
      repo.description,
      repo.family_cluster_id,
      ...(repo.capability_systems || []),
      ...(repo.direct_company_systems || [])
    ].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (disposition === "all" || repo.disposition === disposition);
  }

  function renderRepositories() {
    const rows = (state.data.public_repositories || []).filter(repoMatches);
    const visible = rows.slice(0, state.visible);
    const grid = create("div", "estate-repository-grid");
    visible.forEach((repo) => {
      const card = create("article", "estate-repository-card");
      const stateRow = create("div", "estate-repo-state");
      stateRow.append(create("span", `estate-disposition ${String(repo.disposition).toLowerCase()}`, label(repo.disposition)), create("span", "", label(repo.relevance)));
      const title = create("h3");
      const link = create("a", "", repo.name);
      link.href = repo.url;
      link.target = "_blank";
      link.rel = "noopener";
      title.append(link);
      const description = create("p", "", repo.description);
      const tags = create("div", "estate-repo-tags");
      (repo.capability_systems || []).slice(0, 4).forEach((tag) => tags.append(create("span", "", label(tag))));
      (repo.direct_company_systems || []).slice(0, 2).forEach((tag) => tags.append(create("span", "direct", label(tag))));
      card.append(stateRow, title, description, tags);
      grid.append(card);
    });

    const wrap = create("div");
    wrap.append(grid);
    if (visible.length < rows.length) {
      const more = create("button", "button secondary estate-load-more", `Load 80 more · ${number(rows.length - visible.length)} remaining`);
      more.type = "button";
      more.addEventListener("click", () => {
        state.visible += 80;
        renderMode();
      });
      wrap.append(more);
    }
    return [wrap, `${number(rows.length)} public repositories match`];
  }

  function renderPrivateContribution() {
    const privateData = state.data.private_system_contribution || {};
    const wrap = create("div", "estate-private-layout");
    const intro = create("article", "estate-private-card");
    intro.append(
      create("span", "estate-card-kicker", "COUNTED · NOT PUBLICLY NAMED"),
      create("h3", "", `${number(privateData.repository_count)} private repositories contribute to the system estate.`),
      create("p", "", "Their lifecycle, capability, and company-system edges are included in the audited totals. Names remain private on this public endpoint, and sensitive casework is separately quarantined.")
    );

    const dispositionGrid = create("div", "estate-private-stats");
    Object.entries(privateData.dispositions || {}).forEach(([name, value]) => dispositionGrid.append(stat(label(name), value)));
    intro.append(dispositionGrid);

    const capability = create("article", "estate-private-card");
    capability.append(
      create("span", "estate-card-kicker", "PRIVATE CAPABILITY CONTRIBUTION"),
      create("h3", "", "Private work still strengthens the systems story without becoming a public-source claim.")
    );
    const capabilityList = create("div", "estate-private-capabilities");
    Object.entries(privateData.capability_membership_counts || {}).slice(0, 18).forEach(([name, value]) => {
      const row = create("div");
      row.append(create("span", "", label(name)), create("strong", "", number(value)));
      capabilityList.append(row);
    });
    capability.append(capabilityList);
    wrap.append(intro, capability);
    return [wrap, `${number(privateData.repository_count)} private repositories counted`];
  }

  function renderMode() {
    if (!state.data) return;
    const content = $("#estateContent");
    const status = $("#estateStatus span");
    content.textContent = "";
    let rendered;
    if (state.mode === "companies") rendered = renderCompanies();
    else if (state.mode === "capabilities") rendered = renderCapabilities();
    else if (state.mode === "repositories") rendered = renderRepositories();
    else rendered = renderPrivateContribution();
    content.append(rendered[0]);
    status.textContent = rendered[1];

    $$("[data-estate-mode]").forEach((button) => {
      const active = button.dataset.estateMode === state.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    $("#estateDisposition").disabled = state.mode !== "repositories";
  }

  function renderBoundary() {
    const boundary = $("#estateBoundary");
    const audit = state.data.authority || {};
    const summary = state.data.summary || {};
    boundary.textContent = "";
    boundary.append(
      create("strong", "", "Audited estate boundary"),
      create("p", "", `${number(summary.live_repositories)} live repositories have dispositions and capability records. ${number(summary.unresolved_relevance)} remain in an explicit review queue. Private names are redacted; sensitive and archived repository names are omitted from the public payload; forks remain reference evidence rather than authorship claims.`),
      create("code", "", `audit ${audit.audit_id || "unavailable"} · graph ${audit.hashes?.graph_sha256 || "unavailable"}`)
    );
  }

  function renderAuthority(data) {
    state.data = data;
    renderMetrics(data.summary || {});
    renderBoundary();
    renderMode();
    const auditState = $("#estateStatus .estate-audit-state");
    auditState.textContent = state.degraded ? "STATIC RECEIPT" : "VALIDATOR PASS";
    auditState.classList.toggle("degraded", state.degraded);

    const machineLinks = $("#machineLinks");
    if (machineLinks && !$('a[href="/api/estate"]', machineLinks)) {
      const link = create("a", "machine-link");
      link.href = "/api/estate";
      link.append(create("span", "", "Full estate public projection"), create("span", "", "JSON"));
      machineLinks.append(link);
    }
  }

  function initializeControls() {
    $$("[data-estate-mode]").forEach((button) => button.addEventListener("click", () => {
      state.mode = button.dataset.estateMode;
      state.visible = 80;
      renderMode();
    }));
    $("#estateSearch")?.addEventListener("input", (event) => {
      state.query = event.currentTarget.value.trim().toLowerCase();
      state.visible = 80;
      renderMode();
    });
    $("#estateDisposition")?.addEventListener("change", (event) => {
      state.disposition = event.currentTarget.value;
      state.visible = 80;
      renderMode();
    });
  }

  async function loadAuthority() {
    try {
      const response = await fetch(ENDPOINT, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Estate endpoint failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(error);
      state.degraded = true;
      const fallback = await fetch(FALLBACK, { headers: { Accept: "application/json" } });
      if (!fallback.ok) throw error;
      return await fallback.json();
    }
  }

  async function initialize() {
    addStylesheet();
    patchNavigation();
    buildSection();
    initializeControls();
    try {
      const data = await loadAuthority();
      renderAuthority(data);
    } catch (error) {
      console.error("System estate unavailable", error);
      const status = $("#estateStatus");
      if (status) {
        status.firstElementChild.textContent = "Estate authority unavailable";
        status.lastElementChild.textContent = "FAIL VISIBLE";
        status.lastElementChild.classList.add("degraded");
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
