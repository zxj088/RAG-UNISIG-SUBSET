(() => {
  const list = document.querySelector('#documentList');
  const search = document.querySelector('#documentSearch');
  const count = document.querySelector('#documentCount');
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  let documents = [];
  let searchable = new Map();

  function render() {
    const query = search.value.trim().toLowerCase();
    const visible = documents.filter(document => `${document.index} ${document.reference} ${document.title} ${document.version} ${document.type}`.toLowerCase().includes(query));
    count.textContent = `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'}`;
    list.innerHTML = visible.length ? visible.map(document => {
      const isReserved = document.reference === 'Reserved';
      const searchPage = isReserved ? '' : `subset-098-rag.html?q=${encodeURIComponent(document.reference)}`;
      const href = searchPage || document.page || document.url;
      const availability = isReserved ? '<span class="availability">Source metadata only</span>' : '<span class="availability searchable">Search evidence</span>';
      return `<a class="doc-row" href="${escapeHtml(href)}"><span class="doc-index">${escapeHtml(document.index)}</span><span class="doc-ref">${escapeHtml(document.reference)}</span><span class="doc-title">${escapeHtml(document.title)}</span><span class="doc-version">${escapeHtml(document.version)}</span><span class="doc-type">${escapeHtml(document.type)}</span>${availability}</a>`;
    }).join('') : '<p class="empty-docs">No catalogue entries match this search.</p>';
  }

  search.addEventListener('input', render);
  Promise.all([fetch('era-documents.json', {cache:'no-cache'}), fetch('rights-policy.json', {cache:'no-cache'})])
    .then(async ([documentsResponse, rightsResponse]) => { if (!documentsResponse.ok || !rightsResponse.ok) throw new Error('Catalogue unavailable'); return [await documentsResponse.json(), await rightsResponse.json()]; })
    .then(([data]) => { documents = data; render(); })
    .catch(() => { count.textContent = 'Unavailable'; list.innerHTML = '<p class="empty-docs">The catalogue could not be loaded. Use the ERA archive link above.</p>'; });
})();
