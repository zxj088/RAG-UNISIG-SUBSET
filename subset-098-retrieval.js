(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EvidenceAssistant = api;
  root.Subset098Retrieval = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STOP = new Set('a an and are as at be by can do does for from how in into is it of on or that the this to what when where which who why with'.split(' '));
  const EXPANSIONS = {
    header: ['field', 'format', 'layout'], structure: ['field', 'format', 'layout'],
    layout: ['field', 'format', 'structure'], length: ['size', 'byte', 'bytes', 'octet', 'octets'],
    lengths: ['size', 'byte', 'bytes', 'octet', 'octets'], timestamp: ['stamp', 'tts'],
    timestamps: ['stamp', 'tts'], delete: ['deletion', 'deleted'], deleted: ['delete', 'deletion'],
    distribute: ['distributed', 'distribution'], distributed: ['distribute', 'distribution'],
    establish: ['establishment', 'connect', 'connection'], establishment: ['establish', 'connect', 'connection'],
    disconnect: ['disconnection', 'release'], update: ['updated', 'renewal'], updated: ['update', 'renewal'],
    error: ['errors', 'failure', 'invalid', 'handling'], errors: ['error', 'failure', 'invalid', 'handling']
  };
  const BUNDLES = [
    {id: 'subset-098-sai-header', document: 'SUBSET-098', terms: ['sai', 'header'], clauses: /^5\.4\.4\.1\.(?:[2-9]|1[0-3])$|^5\.4\.5\.3\.[45]$|^5\.4\.9\.3\.10$/},
    {id: 'subset-098-kmac-distribution', document: 'SUBSET-098', terms: ['kmac', 'distribution'], clauses: /^7\.4\.7\.4\.[1-5]$/},
    {id: 'subset-098-sai-error-handling', document: 'SUBSET-098', terms: ['sai', 'error', 'handling'], clauses: /^5\.4\.10\.1\.[1-7]$/}
  ];
  const tokens = value => (String(value).toLowerCase().match(/[a-z0-9]+(?:[-'][a-z0-9]+)?/g) || []).filter(token => !STOP.has(token));
  const queryTokens = value => [...new Set(tokens(value).flatMap(token => [token, ...(EXPANSIONS[token] || [])]))];
  const exactClause = value => String(value).match(/\b\d+(?:\.\d+){1,}\b/)?.[0] || '';

  function normalizeIndex(index) {
    const document = typeof index.document === 'object' ? index.document : {
      id: `${String(index.document || 'document').toLowerCase()}-v${index.version || 'unknown'}`,
      reference: index.document, title: index.title, version: index.version, sourceUrl: index.sourceUrl
    };
    const chunks = index.blocks || index.chunks || [];
    return {...index, document, chunks, blocks: chunks, version: document.version || index.version,
      sourceUrl: document.sourceUrl || index.sourceUrl};
  }

  function detectIntent(question) {
    const value = String(question).toLowerCase();
    if (exactClause(value)) return 'clause-lookup';
    if (/\bwhat (?:is|are|defines?)\b|\bdefinition\b/.test(value)) return 'definition';
    if (/\bhow long\b|\b(?:field )?(?:length|size)\b/.test(value)) return 'field-length';
    if (/\bcompare\b|\bdifference between\b/.test(value)) return 'comparison';
    if (/\berror|failure|invalid\b/.test(value)) return 'error-handling';
    if (/\bstructure|header|layout|format\b/.test(value)) return 'structure';
    if (/\bhow (?:is|are|does|do)|procedure|establish|distribute|delete|update\b/.test(value)) return 'procedure';
    if (/\bshall|must|required|requirement\b/.test(value)) return 'requirement';
    return 'general-search';
  }

  function scoreChunk(chunk, expandedTokens, rawQuery) {
    let score = 0;
    const terms = chunk.terms || {};
    const title = String(chunk.title || '').toLowerCase();
    const clause = String(chunk.clause || '');
    const haystack = `${clause} ${title} ${chunk.text || ''}`.toLowerCase();
    for (const token of expandedTokens) {
      const count = terms[token] || (haystack.match(new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')) || []).length;
      if (count) score += 1 + Math.log2(1 + count);
      if (title.includes(token)) score += 2.2;
    }
    const requestedClause = exactClause(rawQuery);
    if (requestedClause && clause === requestedClause) score += 30;
    const phrase = String(rawQuery).trim().toLowerCase();
    if (phrase.length > 6 && haystack.includes(phrase)) score += 12;
    if (score > 0 && /\b(?:shall|must)\b/i.test(chunk.text || '')) score += 0.25;
    const flags = chunk.qualityFlags || [];
    if (chunk.quality === 'encoding-warning' || flags.includes('possible-mojibake')) score *= 0.65;
    if (chunk.quality === 'table-text') score *= 0.82;
    return score / Math.sqrt(Math.max(1, String(chunk.text || '').length / 260));
  }

  function clauseParent(clause) {
    return clause && clause.includes('.') ? clause.split('.').slice(0, -1).join('.') : '';
  }

  function retrieve(rawIndex, question, limit = 22) {
    const index = normalizeIndex(rawIndex);
    const expandedTokens = queryTokens(question);
    const reference = index.document.reference || '';
    const ranked = index.chunks.map(chunk => ({chunk, score: scoreChunk(chunk, expandedTokens, question), reasons: []}))
      .filter(item => item.score > 0).sort((a, b) => b.score - a.score || Number(a.chunk.page || a.chunk.pdfPage) - Number(b.chunk.page || b.chunk.pdfPage));
    const seeds = ranked.slice(0, 6);
    for (const item of seeds) item.reasons.push('term and title relevance');
    const selected = new Map(seeds.map(item => [item.chunk.id, {...item, context: false}]));
    const expandedSet = new Set(expandedTokens);
    for (const bundle of BUNDLES) {
      if (bundle.document !== reference || !bundle.terms.every(term => expandedSet.has(term))) continue;
      for (const chunk of index.chunks.filter(candidate => bundle.clauses.test(candidate.clause || ''))) {
        selected.set(chunk.id, {chunk, score: 14, context: true, contextLabel: 'verified clause bundle', reasons: [bundle.id]});
      }
    }
    for (const seed of seeds.slice(0, 3)) {
      const position = index.chunks.findIndex(chunk => chunk.id === seed.chunk.id);
      const parent = clauseParent(seed.chunk.clause);
      for (const offset of [-1, 1, 2, 3, 4]) {
        const neighbor = index.chunks[position + offset];
        if (!neighbor || !parent || clauseParent(neighbor.clause) !== parent || selected.has(neighbor.id)) continue;
        selected.set(neighbor.id, {chunk: neighbor, score: seed.score * 0.45, context: true,
          contextLabel: 'adjacent clause context', reasons: [`same parent clause ${parent}`]});
      }
    }
    return [...selected.values()].sort((a, b) => b.score - a.score || Number(a.chunk.page || a.chunk.pdfPage) - Number(b.chunk.page || b.chunk.pdfPage)).slice(0, limit);
  }

  function confidence(results, question) {
    if (!results.length) return 'Insufficient';
    const requestedClause = exactClause(question);
    if (requestedClause && results.some(result => result.chunk.clause === requestedClause)) return 'High';
    if (results.some(result => result.contextLabel === 'verified clause bundle')) return 'High';
    if (results[0].score >= 8 && results.length >= 2) return 'High';
    return results[0].score >= 3 ? 'Medium' : 'Low';
  }

  function composeAnswer(rawIndex, question, results) {
    const index = normalizeIndex(rawIndex);
    const reference = index.document.reference || 'Document';
    const version = index.document.version || 'unknown version';
    const level = confidence(results, question);
    if (!results.length) return {intent: detectIntent(question), confidence: level,
      summary: 'The available evidence does not confirm an answer. Try an exact technical term or clause number.', evidence: []};
    const direct = results.filter(result => !result.context).slice(0, 6);
    const evidence = (direct.length ? direct : results.slice(0, 6)).map(result => ({
      id: result.chunk.id, document: reference, version, clause: result.chunk.clause || null,
      pdfPage: result.chunk.pdfPage || result.chunk.page, title: result.chunk.title || '', text: result.chunk.text,
      sourceUrl: index.document.sourceUrl || index.sourceUrl, reasons: result.reasons || [], quality: result.chunk.quality || 'normal'
    }));
    return {intent: detectIntent(question), confidence: level,
      summary: `I found ${evidence.length} direct evidence ${evidence.length === 1 ? 'block' : 'blocks'} relevant to this question. No requirement has been inferred beyond the retrieved text.`, evidence};
  }

  function buildPrompt(rawIndex, question, results) {
    const answer = composeAnswer(rawIndex, question, results);
    return [answer.summary, '', ...answer.evidence.map(item => `${item.document} v${item.version}, clause ${item.clause || 'unlabelled'}, PDF page ${item.pdfPage}\n${item.text}`), '', `Confidence: ${answer.confidence}`].join('\n');
  }

  return {buildPrompt, composeAnswer, confidence, detectIntent, normalizeIndex, queryTokens, retrieve, scoreChunk};
});
