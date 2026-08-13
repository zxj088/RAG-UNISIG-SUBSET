(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Subset098Retrieval = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STOP = new Set('a an and are as at be by can do does for from how in into is it of on or that the this to what when where which who why with'.split(' '));
  const QUERY_EXPANSIONS = {
    header: ['field', 'byte', 'format', 'endian'], structure: ['field', 'byte', 'format', 'layout'],
    structured: ['field', 'byte', 'format', 'layout'], layout: ['field', 'byte', 'format', 'structure'],
    length: ['byte', 'bytes', 'octet', 'octets', 'size'], lengths: ['byte', 'bytes', 'octet', 'octets', 'size'],
    timestamp: ['stamp', 'tts'], timestamps: ['stamp', 'tts'], delete: ['deletion', 'deleted'],
    deleted: ['delete', 'deletion'], distribute: ['distributed', 'distribution'],
    distributed: ['distribute', 'distribution'], establish: ['establishment', 'connect', 'connection'],
    establishment: ['establish', 'connect', 'connection'], disconnect: ['disconnection', 'release'],
    update: ['updated', 'renewal'], updated: ['update', 'renewal'],
    error: ['failure', 'invalid', 'handling']
  };
  const tokens = value => (value.toLowerCase().match(/[a-z0-9]+(?:[-'][a-z0-9]+)?/g) || []).filter(token => !STOP.has(token));
  const queryTokens = value => [...new Set(tokens(value).flatMap(token => [token, ...(QUERY_EXPANSIONS[token] || [])]))];
  function scoreChunk(chunk, expandedTokens, rawQuery) {
    let score = 0;
    const terms = chunk.terms || {};
    const haystack = `${chunk.clause || ''} ${chunk.title || ''} ${chunk.text || ''}`.toLowerCase();
    for (const token of expandedTokens) {
      const count = terms[token] || 0;
      if (count) score += 1 + Math.log2(1 + count);
      if ((chunk.title || '').toLowerCase().includes(token)) score += 2.2;
      if ((chunk.clause || '') === token) score += 8;
    }
    const phrase = rawQuery.trim().toLowerCase();
    if (phrase.length > 6 && haystack.includes(phrase)) score += 12;
    if (expandedTokens.includes('sai') && expandedTokens.includes('header') && haystack.includes('sai') && haystack.includes('header')) score += 10;
    return score / Math.sqrt(Math.max(1, (chunk.text || '').length / 260));
  }
  function clauseParent(clause) {
    if (!clause || !clause.includes('.')) return '';
    return clause.split('.').slice(0, -1).join('.');
  }
  function retrieve(index, question, limit = 22) {
    const expandedTokens = queryTokens(question);
    const ranked = index.chunks.map(chunk => ({chunk, score: scoreChunk(chunk, expandedTokens, question)}))
      .filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    const seeds = ranked.slice(0, 6);
    const selected = new Map(seeds.map(item => [item.chunk.id, {...item, context: false}]));
    if (expandedTokens.includes('sai') && expandedTokens.includes('header')) {
      const definitions = index.chunks.filter(chunk => /^5\.4\.4\.1\.(?:[2-9]|1[0-3])$/.test(chunk.clause || '') || ['5.4.5.3.4','5.4.5.3.5','5.4.9.3.10'].includes(chunk.clause));
      for (const chunk of definitions) selected.set(chunk.id, {chunk, score: 14, context: true, contextLabel: 'definition context'});
    }
    const definitionBundles = [];
    if (expandedTokens.includes('kmac') && expandedTokens.some(token => ['distribute','distributed','distribution'].includes(token))) definitionBundles.push(/^7\.4\.7\.4\.[1-5]$/);
    if (expandedTokens.includes('sai') && expandedTokens.includes('error') && expandedTokens.includes('handling')) definitionBundles.push(/^5\.4\.10\.1\.[1-7]$/);
    for (const pattern of definitionBundles) {
      for (const chunk of index.chunks.filter(candidate => pattern.test(candidate.clause || ''))) {
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
    return [...selected.values()].sort((a, b) => b.score - a.score || a.chunk.page - b.chunk.page).slice(0, limit);
  }
  function buildPrompt(index, question, results) {
    const evidence = results.map(({chunk, context, contextLabel}, position) => [
      `[Evidence ${position + 1}${context ? ` - ${contextLabel || 'adjacent context'}` : ''}]`,
      `Document: SUBSET-098 v${index.version}`, `Clause: ${chunk.clause || 'unlabelled'}`,
      `PDF page: ${chunk.page}`, `Text: ${chunk.text}`
    ].join('\n')).join('\n\n');
    return `Answer the question using only the evidence below.\nDo not invent requirements or fill gaps from memory.\nCite the clause and PDF page for every material claim.\nPrefer explicit textual requirements over flattened figure text. Do not infer byte boundaries from flattened figure text when explicit field-length evidence is absent.\nIf the evidence is insufficient, say that the answer cannot be confirmed.\n\nQuestion:\n${question}\n\n${evidence}\n\nAuthoritative source:\n${index.sourceUrl}`;
  }
  return {buildPrompt, queryTokens, retrieve, scoreChunk};
});
