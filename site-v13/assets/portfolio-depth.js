(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));

  async function loadJson(path) {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`${path} failed: ${response.status}`);
    return response.json();
  }

  function ensureSection() {
    let section = $("#portfolio-depth");
    if (section) return section;

    section = document.createElement("section");
    section.id = "portfolio-depth";
    section.className = "section portfolio-depth";
    section.innerHTML = `
      <div class="shell">
        <div class="section-heading">
          <p class="eyebrow">The actual system</p>
          <h2>Crown jewels, company suites, and governed depth</h2>
          <p>The featured stories are the entry point—not the entire portfolio. This layer exposes the systems, promotion states, next gates, and company suites behind the recruiter surface.</p>
        </div>
        <div id="flagshipDepth" class="depth-grid" aria-live="polite"></div>
        <div class="section-heading depth-subheading">
          <p class="eyebrow">Company suites</p>
          <h3>Connected engineering stories, not a wall of repository names</h3>
        </div>
        <div id="companySuiteDepth" class="depth-grid depth-grid-wide" aria-live="polite"></div>
        <div class="depth-actions">
          <a class="button button-primary" href="/data/flagship-registry.json">Open flagship registry</a>
          <a class="button" href="/data/company-suites.json">Open company suites</a>
          <a class="button" href="https://github.com/GlacierEQ/job-app-helix/blob/main/manifests/portfolio_repositories.json" target="_blank" rel="noopener">Open governed inventory</a>
        </div>
      </div>`;

    const anchor = $("#repository-combinations") || $("#evidence-demonstrations") || $("main");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(section, anchor);
    else document.body.appendChild(section);
    return section;
  }

  function renderFlagships(data) {
    const root = $("#flagshipDepth");
    if (!root) return;
    root.innerHTML = data.flagships.map((item) => `
      <article class="depth-card">
        <div class="depth-meta"><span>${esc(item.tier)}</span><span>${esc(item.state)}</span></div>
        <h3>${esc(item.id.replace(/-/g, " "))}</h3>
        <p>${esc(item.role)}</p>
        ${item.current_evidence ? `<p class="depth-proof"><strong>Evidence:</strong> ${esc(item.current_evidence)}</p>` : ""}
        <p class="depth-gate"><strong>Next gate:</strong> ${esc(item.next_gate)}</p>
        ${item.repository ? `<a href="https://github.com/${esc(item.repository)}" target="_blank" rel="noopener">Open repository</a>` : `<span class="depth-muted">Canonical public source required</span>`}
      </article>`).join("");
  }

  function renderSuites(data) {
    const root = $("#companySuiteDepth");
    if (!root) return;
    root.innerHTML = data.suites.map((suite) => `
      <article class="depth-card depth-suite">
        <div class="depth-meta"><span>${esc(suite.promotion_state)}</span><span>${suite.repositories?.length || 0} repos</span></div>
        <h3>${esc(suite.name)}</h3>
        <p>${esc(suite.story)}</p>
        <p><strong>Flagship:</strong> ${esc(suite.flagship)}</p>
        ${suite.supporting?.length ? `<p><strong>Supporting:</strong> ${suite.supporting.map(esc).join(", ")}</p>` : ""}
        ${suite.experiments?.length ? `<p><strong>Experiments:</strong> ${suite.experiments.map(esc).join(", ")}</p>` : ""}
        <p class="depth-gate"><strong>Next gate:</strong> ${esc(suite.next_gate)}</p>
        ${suite.non_affiliation ? `<p class="depth-muted">${esc(suite.non_affiliation)}</p>` : ""}
      </article>`).join("");
  }

  async function init() {
    ensureSection();
    try {
      const [flagships, suites] = await Promise.all([
        loadJson("/data/flagship-registry.json"),
        loadJson("/data/company-suites.json")
      ]);
      renderFlagships(flagships);
      renderSuites(suites);
    } catch (error) {
      const section = $("#portfolio-depth");
      if (section) section.dataset.error = error.message;
      console.error("Portfolio depth failed", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
