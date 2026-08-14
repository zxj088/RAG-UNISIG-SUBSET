(() => {
  const {composeAnswer, normalizeIndex, retrieve} = window.EvidenceAssistant;
  const els = Object.fromEntries(['status','retry','question','search','clear','results','answer'].map(id => [id, document.querySelector(`#${id}`)]));
  const EVIDENCE_URL = 'evidence-subset-098.html';
  const SOURCE_URL = 'https://www.era.europa.eu/system/files/2023-01/sos3_index063_-_subset-098_v300.pdf';
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  let index = null;

  function evidenceCard(result) {
    const {chunk, context, contextLabel, reasons} = result;
    const page = chunk.pdfPage || chunk.page;
    const citation = `${index.document.reference} v${index.document.version}, clause ${chunk.clause || 'Unnumbered content'}, PDF p.${page}`;
    const quality = chunk.quality && chunk.quality !== 'normal' ? `<span class="rag-quality">Extraction warning: ${escapeHtml(chunk.quality)}</span>` : '';
    return `<article class="rag-result${context ? ' context' : ''}"><header><h3>${escapeHtml(chunk.clause ? `Clause ${chunk.clause}` : `PDF page ${page}`)}${chunk.title ? ` — ${escapeHtml(chunk.title)}` : ''}</h3><span class="rag-kind">${context ? escapeHtml(contextLabel || 'Supporting context') : 'Direct match'}</span></header><p>${escapeHtml(chunk.text)}</p>${quality}<div class="rag-source">${escapeHtml(citation)} · <a href="${escapeHtml(index.document.sourceUrl || SOURCE_URL)}#page=${page}" target="_blank" rel="noopener">open source PDF at page ${page}</a><button class="citation-copy" type="button" data-citation="${escapeHtml(citation)}">Copy citation</button></div><details><summary>Why this evidence?</summary><p>${escapeHtml((reasons || []).join('; ') || 'Verified adjacent clause context')}</p></details></article>`;
  }

  function render(question, results) {
    const direct = results.filter(result => !result.context).slice(0, 6);
    const context = results.filter(result => result.context).slice(0, 6);
    const answer = composeAnswer(index, question, results);
    const matchStrength = answer.confidence === 'High' ? 'Strong lexical match' : answer.confidence === 'Medium' ? 'Moderate lexical match' : 'Limited lexical match';
    els.answer.innerHTML = direct.length ? `<p>Found ${direct.length} direct evidence ${direct.length === 1 ? 'block' : 'blocks'}${context.length ? ` with ${context.length} supporting context ${context.length === 1 ? 'clause' : 'clauses'}` : ''}. No requirement has been inferred beyond the retrieved text.</p><div class="rag-meta"><strong>Query type: ${escapeHtml(answer.intent)}</strong><strong>${matchStrength}</strong></div>` : '<p class="rag-empty">No matching evidence was found. Try an exact clause number or more specific technical terms.</p>';
    els.results.innerHTML = direct.length ? `<h3 class="rag-section-title">Direct evidence</h3>${direct.map(evidenceCard).join('')}${context.length ? `<h3 class="rag-section-title">Supporting clause context</h3>${context.map(evidenceCard).join('')}` : ''}` : '<p class="rag-empty">No matching evidence found.</p>';
  }

  function parseEvidence(markup) {
    const page = new DOMParser().parseFromString(markup, 'text/html');
    const blocks = [...page.querySelectorAll('article')].map(article => {
      const heading = article.querySelector('h2')?.textContent.trim() || '';
      const paragraphs = article.querySelectorAll('p');
      const citation = paragraphs[0]?.textContent.trim() || '';
      const text = paragraphs[1]?.textContent.trim() || '';
      const match = citation.match(/^Citation:\s+SUBSET-098\s+v([^,]+),\s+clause\s+(.+),\s+PDF p\.(\d+)$/i);
      if (!match || !text) return null;
      return {id: article.id, clause: match[2] === 'Unnumbered content' ? null : match[2], pdfPage: Number(match[3]), title: heading.replace(/^Clause\s+[^—]+—\s*/, '').trim(), text, quality: 'normal', qualityFlags: []};
    }).filter(Boolean);
    if (!blocks.length) throw new Error('No evidence blocks were found');
    return normalizeIndex({schemaVersion: 2, document: {id:'subset-098-v300', reference:'SUBSET-098', title:'RBC-RBC Safe Communication Interface', version:'3.0.0', sourceUrl:SOURCE_URL}, pageCount:109, blockCount:blocks.length, blocks});
  }

  function runSearch() {
    const question = els.question.value.trim();
    if (!index) { els.status.textContent = 'Published evidence is not ready.'; return; }
    if (!question) { els.status.textContent = 'Enter a question or clause first.'; els.question.focus(); return; }
    render(question, retrieve(index, question));
    const url = new URL(location.href); url.searchParams.set('q', question); history.replaceState(null, '', url);
    document.querySelector('#answer-title').scrollIntoView({behavior:'smooth', block:'start'});
  }

  async function loadEvidence() {
    els.search.disabled = true; els.retry.hidden = true; els.status.textContent = 'Loading published evidence…';
    try {
      const response = await fetch(EVIDENCE_URL, {cache:'no-cache'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      index = parseEvidence(await response.text());
      els.search.disabled = false;
      els.status.textContent = `Ready: ${index.chunks.length} evidence blocks · SUBSET-098 v3.0.0 · 109 PDF pages.`;
      els.answer.innerHTML = '<p class="rag-empty">Enter an English question or exact clause number.</p>';
      els.results.innerHTML = '<p class="rag-empty">No search has been run yet.</p>';
      const initial = new URL(location.href).searchParams.get('q');
      if (initial) { els.question.value = initial; runSearch(); }
    } catch (error) {
      index = null; els.retry.hidden = false; els.status.textContent = `Could not load published evidence: ${error.message}.`;
      els.answer.innerHTML = '<p class="rag-empty">Evidence is unavailable. Retry loading or use the ERA source link on the SUBSET-098 catalogue page.</p>';
    }
  }

  els.search.addEventListener('click', runSearch);
  els.retry.addEventListener('click', loadEvidence);
  els.clear.addEventListener('click', () => { els.question.value=''; history.replaceState(null,'',location.pathname); els.answer.innerHTML='<p class="rag-empty">Enter an English question or exact clause number.</p>'; els.results.innerHTML='<p class="rag-empty">No search has been run yet.</p>'; els.question.focus(); });
  els.question.addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) runSearch(); });
  document.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => { els.question.value = button.dataset.question; runSearch(); }));
  els.results.addEventListener('click', async event => { const button = event.target.closest('[data-citation]'); if (!button) return; try { await navigator.clipboard.writeText(button.dataset.citation); button.textContent='Copied'; setTimeout(() => { button.textContent='Copy citation'; }, 1500); } catch { button.textContent='Copy manually'; } });
  loadEvidence();
})();
