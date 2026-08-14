(() => {
  const {search} = window.AllEvidenceSearch;
  const els = Object.fromEntries(['status','retry','question','search','clear','results','answer','documentFilter'].map(id => [id, document.querySelector(`#${id}`)]));
  const INDEX_URL = 'all-evidence-index.json';
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  let index = null;

  function citation(result) {
    const {record, document} = result;
    return `${document.reference} v${document.version}, ${record.c ? `clause ${record.c}` : 'unnumbered content'}, PDF p.${record.p}`;
  }

  function render(question, results) {
    const documentCount = new Set(results.map(result => result.record.d)).size;
    els.answer.innerHTML = results.length ? `<p>Found ${results.length} ranked evidence ${results.length === 1 ? 'excerpt' : 'excerpts'} across ${documentCount} ${documentCount === 1 ? 'document' : 'documents'}. No clause or conclusion has been generated beyond the indexed source text.</p><div class="rag-meta"><strong>Deterministic term and clause matching</strong><strong>Verify every source citation</strong></div>` : '<p class="rag-empty">No matching evidence was found. Try a document reference, exact clause number or more specific technical terms.</p>';
    els.results.innerHTML = results.length ? results.map(result => {
      const {record, document} = result;
      const label = record.c ? `Clause ${record.c}` : `PDF page ${record.p}`;
      const cite = citation(result);
      return `<article class="rag-result"><header><h3>${escapeHtml(document.reference)} · ${escapeHtml(label)}${record.t ? ` — ${escapeHtml(record.t)}` : ''}</h3><span class="rag-kind">Ranked match</span></header><p>${escapeHtml(record.e)}</p>${record.e.length >= 520 ? '<p class="rag-quality">Excerpt truncated — inspect the source for the complete text.</p>' : ''}<div class="rag-source">${escapeHtml(cite)} · <a href="${escapeHtml(document.sourceUrl)}#page=${record.p}" target="_blank" rel="noopener">open source PDF at page ${record.p}</a><button class="citation-copy" type="button" data-citation="${escapeHtml(cite)}">Copy citation</button></div><details><summary>Why this evidence?</summary><p>Matched the question against the document reference, title, clause, extracted text and indexed technical terms.</p></details></article>`;
    }).join('') : '<p class="rag-empty">No matching evidence found.</p>';
  }

  function runSearch() {
    const question = els.question.value.trim();
    if (!index) { els.status.textContent = 'The published evidence index is not ready.'; return; }
    if (!question) { els.status.textContent = 'Enter a question, document reference or clause first.'; els.question.focus(); return; }
    const selectedDocument = els.documentFilter.value === '' ? null : index.documents[Number(els.documentFilter.value)];
    if (selectedDocument && selectedDocument.blocks === 0) {
      els.answer.innerHTML = `<p>This reserved catalogue source contains no extractable evidence blocks. No clause evidence has been created for it.</p>`;
      els.results.innerHTML = `<p class="rag-empty"><a href="${escapeHtml(selectedDocument.sourceUrl)}" target="_blank" rel="noopener">Open the ERA-hosted source metadata PDF</a>.</p>`;
      return;
    }
    const results = search(index, question, els.documentFilter.value);
    render(question, results);
    const url = new URL(location.href); url.searchParams.set('q', question); if (els.documentFilter.value) url.searchParams.set('d', els.documentFilter.value); else url.searchParams.delete('d'); history.replaceState(null,'',url);
    document.querySelector('#answer-title').scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function loadIndex() {
    els.search.disabled = true; els.retry.hidden = true; els.status.textContent = 'Loading the complete published evidence index…';
    try {
      const response = await fetch(INDEX_URL, {cache:'no-cache'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      index = await response.json();
      els.documentFilter.innerHTML = '<option value="">All indexed documents</option>' + index.documents.map((document, position) => `<option value="${position}">${escapeHtml(document.reference)} v${escapeHtml(document.version)} — ${escapeHtml(document.title || '')}${document.blocks ? '' : ' (source metadata only)'}</option>`).join('');
      const params = new URL(location.href).searchParams;
      const requestedReference = params.get('document');
      const requestedPosition = params.get('d');
      if (requestedPosition && index.documents[Number(requestedPosition)]) els.documentFilter.value = requestedPosition;
      else if (requestedReference) { const position=index.documents.findIndex(document=>document.reference.toLowerCase()===requestedReference.toLowerCase()); if(position>=0) els.documentFilter.value=String(position); }
      els.search.disabled = false;
      els.status.textContent = `Ready: ${index.blockCount.toLocaleString()} evidence blocks · 84 searchable sources · 3 reserved metadata-only sources.`;
      els.answer.innerHTML = '<p class="rag-empty">Enter an English question, document reference or exact clause number.</p>';
      els.results.innerHTML = '<p class="rag-empty">No search has been run yet.</p>';
      const initial = params.get('q'); if (initial) { els.question.value=initial; runSearch(); }
    } catch (error) {
      index = null; els.retry.hidden=false; els.status.textContent=`Could not load the published evidence index: ${error.message}.`; els.answer.innerHTML='<p class="rag-empty">Evidence is unavailable. Retry loading.</p>';
    }
  }

  els.search.addEventListener('click',runSearch);
  els.retry.addEventListener('click',loadIndex);
  els.documentFilter.addEventListener('change',()=>{if(els.question.value.trim())runSearch();});
  els.clear.addEventListener('click',()=>{els.question.value='';els.documentFilter.value='';history.replaceState(null,'',location.pathname);els.answer.innerHTML='<p class="rag-empty">Enter an English question, document reference or exact clause number.</p>';els.results.innerHTML='<p class="rag-empty">No search has been run yet.</p>';els.question.focus();});
  els.question.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey))runSearch();});
  document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{els.question.value=button.dataset.question;runSearch();}));
  els.results.addEventListener('click',async event=>{const button=event.target.closest('[data-citation]');if(!button)return;try{await navigator.clipboard.writeText(button.dataset.citation);button.textContent='Copied';setTimeout(()=>{button.textContent='Copy citation';},1500);}catch{button.textContent='Copy manually';}});
  loadIndex();
})();
