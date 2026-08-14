(() => {
  const {composeAnswer, normalizeIndex, retrieve} = window.EvidenceAssistant;
  const els = {
    status: document.querySelector('#status'), retry: document.querySelector('#retry'),
    question: document.querySelector('#question'), search: document.querySelector('#search'),
    results: document.querySelector('#results'), answer: document.querySelector('#answer')
  };
  let index = null;
  const PUBLISHED_EVIDENCE_URL = 'evidence-subset-098.html';
  const AUTHORITATIVE_SOURCE_URL = 'https://www.era.europa.eu/system/files/2023-01/sos3_index063_-_subset-098_v300.pdf';
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

  function render(answer, results) {
    els.answer.innerHTML = `<p>${escapeHtml(answer.summary)}</p><div class="rag-meta"><strong>Intent: ${escapeHtml(answer.intent)}</strong><strong>Confidence: ${escapeHtml(answer.confidence)}</strong></div>`;
    if (!results.length) {
      els.results.innerHTML = '<p class="rag-empty">No matching evidence found. Try exact technical terms or a clause number.</p>';
      return;
    }
    const document = index.document;
    els.results.innerHTML = results.map(({chunk, score, context, contextLabel, reasons}) => {
      const page = chunk.pdfPage || chunk.page;
      const source = document.sourceUrl || index.sourceUrl;
      const quality = chunk.quality && chunk.quality !== 'normal' ? `<span class="rag-quality">Extraction warning: ${escapeHtml(chunk.quality)}</span>` : '';
      return `<article class="rag-result">
        <header><h3>${escapeHtml(chunk.clause ? `Clause ${chunk.clause}` : `PDF page ${page}`)}${chunk.title ? ` — ${escapeHtml(chunk.title)}` : ''}</h3><span class="rag-score">${context ? escapeHtml(contextLabel || 'context') : `score ${score.toFixed(2)}`}</span></header>
        <p>${escapeHtml(chunk.text)}</p>${quality}
        <div class="rag-source">${escapeHtml(document.reference)} v${escapeHtml(document.version)} · PDF page ${page}${source ? ` · <a href="${escapeHtml(source)}" target="_blank" rel="noopener">authoritative source</a>` : ''}</div>
        <details><summary>Why this evidence?</summary><p>${escapeHtml((reasons || []).join('; ') || 'Adjacent verified context')}</p></details>
      </article>`;
    }).join('');
  }

  function parsePublishedEvidence(markup) {
    const page = new DOMParser().parseFromString(markup, 'text/html');
    const blocks = [...page.querySelectorAll('article')].map(article => {
      const heading = article.querySelector('h2')?.textContent.trim() || '';
      const paragraphs = article.querySelectorAll('p');
      const citation = paragraphs[0]?.textContent.trim() || '';
      const text = paragraphs[1]?.textContent.trim() || '';
      const match = citation.match(/^Citation:\s+SUBSET-098\s+v([^,]+),\s+clause\s+(.+),\s+PDF p\.(\d+)$/i);
      if (!match || !text) return null;
      const clause = match[2] === 'Unnumbered content' ? null : match[2];
      return {id: article.id, clause, pdfPage: Number(match[3]),
        title: heading.replace(/^Clause\s+[^—]+—\s*/, '').trim(), text, quality: 'normal', qualityFlags: []};
    }).filter(Boolean);
    if (!blocks.length) throw new Error('No evidence blocks were found in the published corpus');
    return normalizeIndex({schemaVersion: 2, document: {id: 'subset-098-v300', reference: 'SUBSET-098',
      title: 'RBC-RBC Safe Communication Interface', version: '3.0.0', sourceUrl: AUTHORITATIVE_SOURCE_URL},
      pageCount: 109, blockCount: blocks.length, blocks});
  }

  async function loadPublishedEvidence() {
    els.search.disabled = true;
    els.retry.hidden = true;
    els.status.textContent = 'Loading published evidence…';
    try {
      const response = await fetch(PUBLISHED_EVIDENCE_URL, {cache: 'no-cache'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      index = parsePublishedEvidence(await response.text());
      els.search.disabled = false;
      els.status.textContent = `Ready: ${index.chunks.length} evidence blocks from SUBSET-098 v3.0.0 (${index.pageCount} PDF pages).`;
      els.answer.innerHTML = '<p class="rag-empty">Enter an English question to retrieve evidence.</p>';
      els.results.innerHTML = '<p class="rag-empty">No search has been run yet.</p>';
    } catch (error) {
      index = null;
      els.retry.hidden = false;
      els.status.textContent = `Could not load published evidence: ${error.message}. Serve this directory over HTTP when testing locally.`;
    }
  }

  els.retry.addEventListener('click', loadPublishedEvidence);

  els.search.addEventListener('click', () => {
    const question = els.question.value.trim();
    if (!index) { els.status.textContent = 'Published evidence is not ready. Retry loading it first.'; return; }
    if (!question) { els.status.textContent = 'Enter an English question first.'; return; }
    const results = retrieve(index, question);
    render(composeAnswer(index, question, results), results);
  });

  loadPublishedEvidence();
})();
