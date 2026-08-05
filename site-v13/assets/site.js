(() => {
  "use strict";

  const loadModule = async (path) => {
    const wasLoading = document.readyState === "loading";
    await import(path);
    if (wasLoading && document.readyState !== "loading") {
      document.dispatchEvent(new Event("DOMContentLoaded"));
    }
  };

  (async () => {
    try {
      await loadModule("/assets/site-core.js");
      await import("/assets/estate.js");
    } catch (error) {
      console.error("Portfolio module loader failed", error);
      document.body?.classList.add("data-error");
    }
  })();
})();
