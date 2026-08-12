(function attachAtlasRuntime(global) {
  "use strict";

  function normalizeAtlasText(value) {
    return String(value ?? "").trim().toLocaleLowerCase();
  }

  function matchesAtlasItem({ query = "", evidence = "all", text = "", evidenceState = "" }) {
    const normalizedQuery = normalizeAtlasText(query);
    const normalizedText = normalizeAtlasText(text);
    const normalizedEvidence = normalizeAtlasText(evidence);
    const normalizedState = normalizeAtlasText(evidenceState);

    const queryMatches = !normalizedQuery || normalizedText.includes(normalizedQuery);
    const evidenceMatches = normalizedEvidence === "all" || normalizedEvidence === normalizedState;
    return queryMatches && evidenceMatches;
  }

  function initAtlasRuntime(documentRef) {
    const doc = documentRef ?? global.document;
    if (!doc) return false;

    const search = doc.querySelector("[data-atlas-search]");
    const evidence = doc.querySelector("[data-atlas-evidence]");
    const count = doc.querySelector("[data-atlas-result-count]");
    const directory = doc.querySelector(".atlas-directory");

    if (!search || !evidence || !count || !directory) return false;

    const items = [...directory.querySelectorAll(".atlas-directory-item")];

    const apply = () => {
      let visible = 0;
      for (const item of items) {
        const badge = item.querySelector(".evidence-state");
        const state = badge
          ? [...badge.classList].find((name) => ["repository-rich", "seeded", "scaffold"].includes(name)) ?? ""
          : "";
        const matches = matchesAtlasItem({
          query: search.value,
          evidence: evidence.value,
          text: item.textContent,
          evidenceState: state,
        });
        item.hidden = !matches;
        if (matches) visible += 1;
      }
      count.textContent = `${visible} of ${items.length} company lenses`;
      directory.dataset.visibleCount = String(visible);
      return visible;
    };

    search.addEventListener("input", apply);
    evidence.addEventListener("change", apply);
    apply();
    return true;
  }

  const api = Object.freeze({ normalizeAtlasText, matchesAtlasItem, initAtlasRuntime });
  global.AtlasRuntime = api;

  if (global.document) {
    if (global.document.readyState === "loading") {
      global.document.addEventListener("DOMContentLoaded", () => initAtlasRuntime(global.document), { once: true });
    } else {
      initAtlasRuntime(global.document);
    }
  }
})(globalThis);
