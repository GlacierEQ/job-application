(() => {
  const esc = (value = '') => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  const load = async path => {
    const response = await fetch(path, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  };

  function renderFlagships(data) {
    document.querySelector('#flagshipCount').textContent = data.flagships.length;
    document.querySelector('#flagshipGrid').innerHTML = data.flagships.map(item => `
      <article class="depth-card">
        <div class="chips"><span class="chip">${esc(item.tier)}</span><span class="chip">${esc(item.state)}</span></div>
        <h3>${esc(item.name)}</h3>
        <p>${esc(item.role)}</p>
        ${item.evidence ? `<p><strong>Evidence:</strong> ${esc(item.evidence)}</p>` : ''}
        <p class="gate"><strong>Next gate:</strong> ${esc(item.next_gate)}</p>
        ${item.repository ? `<a href="https://github.com/${esc(item.repository)}" target="_blank" rel="noopener">Open canonical repository →</a>` : '<span class="muted">Canonical public source required</span>'}
      </article>`).join('');
  }

  function renderSuites(data) {
    document.querySelector('#suiteCount').textContent = data.suites.length;
    document.querySelector('#suiteGrid').innerHTML = data.suites.map(suite => `
      <article class="depth-card">
        <div class="chips"><span class="chip">${esc(suite.state)}</span><span class="chip">${suite.repositories?.length || 0} repos</span></div>
        <h3>${esc(suite.name)}</h3>
        <p>${esc(suite.story)}</p>
        <p><strong>Flagship:</strong> ${esc(suite.flagship)}</p>
        ${suite.supporting?.length ? `<p><strong>Supporting:</strong> ${suite.supporting.map(esc).join(', ')}</p>` : ''}
        ${suite.experiments?.length ? `<p><strong>Experiments:</strong> ${suite.experiments.map(esc).join(', ')}</p>` : ''}
        ${suite.historical?.length ? `<p><strong>Historical lines:</strong> ${suite.historical.map(esc).join(', ')}</p>` : ''}
        ${suite.audit_candidates?.length ? `<p><strong>Audit candidates:</strong> ${suite.audit_candidates.map(esc).join(', ')}</p>` : ''}
        <details><summary>All admitted repositories</summary><p class="repo-list">${(suite.repositories || []).map(esc).join('<br>')}</p></details>
        <p class="gate"><strong>Next gate:</strong> ${esc(suite.next_gate)}</p>
        ${suite.boundary ? `<p class="muted">${esc(suite.boundary)}</p>` : ''}
      </article>`).join('');
  }

  Promise.all([
    load('/data/flagship-registry.json'),
    load('/data/company-suites.json')
  ]).then(([flagships, suites]) => {
    renderFlagships(flagships);
    renderSuites(suites);
  }).catch(error => {
    document.querySelector('#flagshipGrid').innerHTML = `<div class="error">Portfolio depth failed to load: ${esc(error.message)}</div>`;
    console.error(error);
  });
})();
