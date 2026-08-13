(() => {
  const STOP = new Set('a an and are as at be by can do does for from how in into is it of on or that the this to what when where which who why with'.split(' '));
  const els = {
    file: document.querySelector('#index-file'), status: document.querySelector('#status'),
    question: document.querySelector('#question'), search: document.querySelector('#search'),
    copy: document.querySelector('#copy'), results: document.querySelector('#results'),
    prompt: document.querySelector('#prompt')
  };
  let index = null;
  let lastResults = [];

  const tokens = value => (value.toLowerCase().match(/[a-z0-9]+(?:[-'][a-z0-9]+)?/g) || []).filter(t => !STOP.has(t));
  const QUERY_EXPANSIONS = {
    header: ['field', 'byte', 'format', 'endian'],
    structure: ['field', 'byte', 'format', 'layout'],
    structured: ['field', 'byte', 'format', 'layout'],
    layout: ['field', 'byte', 'format', 'structure'],
    length: ['byte', 'bytes', 'octet', 'octets', 'size'],
    lengths: ['byte', 'bytes', 'octet', 'octets', 'size'],
    timestamp: ['stamp', 'tts'],
    timestamps: ['stamp', 'tts'],
    delete: ['deletion', 'deleted'],
    deleted: ['delete', 'deletion']
  };
  const queryTokens = value => {
    const direct = tokens(value);
    return [...new Set(direct.flatMap(token => [token, ...(QUERY_EXPANSIONS[token] || [])]))];
  };
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function scoreChunk(chunk, queryTokens, rawQuery) {
    let score = 0;
    const terms = chunk.terms || {};
    const haystack = `${chunk.clause || ''} ${chunk.title || ''} ${chunk.text || ''}`.toLowerCase();
    for (const token of queryTokens) {
      const count = terms[token] || 0;
      if (count) score += 1 + Math.log2(1 + count);
      if ((chunk.title || '').toLowerCase().includes(token)) score += 2.2;
      if ((chunk.clause || '') === token) score += 8;
    }
    const phrase = rawQuery.trim().toLowerCase();
    if (phrase.length > 6 && haystack.includes(phrase)) score += 12;
    if (queryTokens.includes('sai') && queryTokens.includes('header') && haystack.includes('sai') && haystack.includes('header')) score += 10;
    return score / Math.sqrt(Math.max(1, (chunk.text || '').length / 260));
  }

  function clauseParent(clause) {
    if (!clause || !clause.includes('.')) return '';
    return clause.split('.').slice(0, -1).join('.');
  }

  function retrieve(question, limit = 22) {
    const expandedTokens = queryTokens(question);
    const ranked = index.chunks
      .map(chunk => ({chunk, score: scoreChunk(chunk, expandedTokens, question)}))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
    const seeds = ranked.slice(0, 6);
    const selected = new Map(seeds.map(item => [item.chunk.id, {...item, context: false}]));
    const asksSaiHeader = expandedTokens.includes('sai') && expandedTokens.includes('header');
    if (asksSaiHeader) {
      const definitionClauses = index.chunks.filter(chunk =>
        /^5\.4\.4\.1\.(?:[2-9]|1[0-3])$/.test(chunk.clause || '') ||
        ['5.4.5.3.4', '5.4.5.3.5', '5.4.9.3.10'].includes(chunk.clause)
      );
      for (const chunk of definitionClauses) {
        selected.set(chunk.id, {chunk, score: 14, context: true, contextLabel: 'definition context'});
      }
    }
    for (const seed of seeds.slice(0, 3)) {
      const position = index.chunks.findIndex(chunk => chunk.id === seed.chunk.id);
      const parent = clauseParent(seed.chunk.clause);
      for (const offset of [-1, 1, 2, 3, 4]) {
        const neighbor = index.chunks[position + offset];
        if (!neighbor || !parent || clauseParent(neighbor.clause) !== parent || selected.has(neighbor.id)) continue;
        selected.set(neighbor.id, {chunk: neighbor, score: seed.score * 0.45, context: true});
      }
    }
    return [...selected.values()]
      .sort((a, b) => b.score - a.score || a.chunk.page - b.chunk.page)
      .slice(0, limit);
  }

  function buildPrompt(question, results) {
    const evidence = results.map(({chunk, context, contextLabel}, i) => [
      `[Evidence ${i + 1}${context ? ` - ${contextLabel || 'adjacent context'}` : ''}]`,
      `Document: SUBSET-098 v${index.version}`,
      `Clause: ${chunk.clause || 'unlabelled'}`,
      `PDF page: ${chunk.page}`,
      `Text: ${chunk.text}`
    ].join('\n')).join('\n\n');
    return `Answer the question using only the evidence below.\nDo not invent requirements or fill gaps from memory.\nCite the clause and PDF page for every material claim.\nPrefer explicit textual requirements over flattened figure text. Do not infer byte boundaries from flattened figure text when explicit field-length evidence is absent.\nIf the evidence is insufficient, say that the answer cannot be confirmed.\n\nQuestion:\n${question}\n\n${evidence}\n\nAuthoritative source:\n${index.sourceUrl}`;
  }

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
    lastResults = retrieve(question);
    render(lastResults);
    els.prompt.value = buildPrompt(question, lastResults);
    els.copy.disabled = !lastResults.length;
  });

  els.copy.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(els.prompt.value);
      } else {
        els.prompt.focus();
        els.prompt.select();
        if (!document.execCommand('copy')) throw new Error('Copy command was rejected');
      }
      els.copy.textContent = 'Copied';
      setTimeout(() => { els.copy.textContent = 'Copy Copilot prompt'; }, 1200);
    } catch {
      els.copy.textContent = 'Select the prompt and copy it manually';
    }
  });
})();
