(() => {
  const list = document.querySelector('#documentList');
  const search = document.querySelector('#documentSearch');
  const count = document.querySelector('#documentCount');
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  let documents = [];

  function render() {
    const query = search.value.trim().toLowerCase();
    const visible = documents.filter(document => `${document.index} ${document.reference} ${document.title} ${document.version} ${document.type}`.toLowerCase().includes(query));
    count.textContent = `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'}`;
    list.innerHTML = visible.length ? visible.map(document => `<a class="doc-row" href="${escapeHtml(document.page || document.url)}"><span class="doc-index">${escapeHtml(document.index)}</span><span class="doc-ref">${escapeHtml(document.reference)}</span><span class="doc-title">${escapeHtml(document.title)}</span><span class="doc-version">${escapeHtml(document.version)}</span><span class="doc-type">${escapeHtml(document.type)} <span aria-hidden="true">→</span></span></a>`).join('') : '<p class="empty-docs">No catalogue entries match this search.</p>';
  }

  search.addEventListener('input', render);
  fetch('era-documents.json', {cache: 'no-cache'})
    .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then(data => { documents = data; render(); })
    .catch(() => { count.textContent = 'Unavailable'; list.innerHTML = '<p class="empty-docs">The catalogue could not be loaded. Use the ERA archive link above.</p>'; });
})();
