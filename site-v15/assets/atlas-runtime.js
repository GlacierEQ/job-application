export function normalizeAtlasText(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

export function matchesAtlasItem({ query = "", evidence = "all", text = "", evidenceState = "" }) {
  const normalizedQuery = normalizeAtlasText(query);
  const normalizedText = normalizeAtlasText(text);
  const normalizedEvidence = normalizeAtlasText(evidence);
  const normalizedState = normalizeAtlasText(evidenceState);

  const queryMatches = !normalizedQuery || normalizedText.includes(normalizedQuery);
  const evidenceMatches = normalizedEvidence === "all" || normalizedEvidence === normalizedState;
  return queryMatches && evidenceMatches;
}

export function initAtlasRuntime(documentRef = document) {
  const search = documentRef.querySelector("[data-atlas-search]");
  const evidence = documentRef.querySelector("[data-atlas-evidence]");
  const count = documentRef.querySelector("[data-atlas-result-count]");
  const directory = documentRef.querySelector(".atlas-directory");

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

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAtlasRuntime(document), { once: true });
  } else {
    initAtlasRuntime(document);
  }
}
