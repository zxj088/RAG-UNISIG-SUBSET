(() => {
  const {buildPrompt, retrieve} = window.Subset098Retrieval;
  const els = {
    file: document.querySelector('#index-file'), status: document.querySelector('#status'),
    question: document.querySelector('#question'), search: document.querySelector('#search'),
    copy: document.querySelector('#copy'), results: document.querySelector('#results'),
    prompt: document.querySelector('#prompt')
  };
  let index = null;
  let lastResults = [];
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

  function render(results) {
    if (!results.length) {
      els.results.innerHTML = '<p class="rag-empty">No matching evidence found. Try exact technical terms or a clause number.</p>';
      return;
    }
    els.results.innerHTML = results.map(({chunk, score, context, contextLabel}) => `
      <article class="rag-result">
        <header><h3>${escapeHtml(chunk.clause ? `Clause ${chunk.clause}` : `Page ${chunk.page}`)}${chunk.title ? ` - ${escapeHtml(chunk.title)}` : ''}</h3><span class="rag-score">${context ? (contextLabel || 'adjacent context') : `score ${score.toFixed(2)}`}</span></header>
        <p>${escapeHtml(chunk.text)}</p>
        <div class="rag-source">SUBSET-098 v${escapeHtml(index.version)} · PDF page ${chunk.page}</div>
      </article>`).join('');
  }

  els.file.addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.document !== 'SUBSET-098' || !Array.isArray(parsed.chunks)) throw new Error('Not a SUBSET-098 index');
      index = parsed;
      els.status.textContent = `Loaded ${parsed.chunkCount} chunks from SUBSET-098 v${parsed.version} (${parsed.pageCount} pages).`;
    } catch (error) {
      index = null;
      els.status.textContent = `Could not load index: ${error.message}`;
    }
  });

  els.search.addEventListener('click', () => {
    const question = els.question.value.trim();
    if (!index) { els.status.textContent = 'Load the generated local JSON index first.'; return; }
    if (!question) { els.status.textContent = 'Enter a question first.'; return; }
    lastResults = retrieve(index, question);
    render(lastResults);
    els.prompt.value = buildPrompt(index, question, lastResults);
    els.copy.disabled = !lastResults.length;
  });

  els.copy.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(els.prompt.value);
      else {
        els.prompt.focus(); els.prompt.select();
        if (!document.execCommand('copy')) throw new Error('Copy command was rejected');
      }
      els.copy.textContent = 'Copied';
      setTimeout(() => { els.copy.textContent = 'Copy Copilot prompt'; }, 1200);
    } catch {
      els.copy.textContent = 'Select the prompt and copy it manually';
    }
  });
})();
