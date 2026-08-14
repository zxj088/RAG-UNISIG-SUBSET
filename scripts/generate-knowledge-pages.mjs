import fs from 'node:fs';

const SITE = 'https://zxj088.github.io/RAG-UNISIG-SUBSET';
const documents = JSON.parse(fs.readFileSync('era-documents.json', 'utf8'));
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const used = new Map();

for (const document of documents) {
  const base = (document.reference && document.reference !== '—' ? document.reference : `index-${document.index}`).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const count = (used.get(base) || 0) + 1;
  used.set(base, count);
  document.page = `${count === 1 ? base : `${base}-${count}`}.html`;
  const canonical = `${SITE}/${document.page}`;
  const retrieval = document.reference === 'SUBSET-098' ? '<a class="primary knowledge-download" href="subset-098-rag.html">Search cited evidence</a>' : '';
  fs.writeFileSync(document.page, `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(document.reference)} — ${esc(document.title)}</title><meta name="description" content="Catalogue metadata for ${esc(document.reference)}, ${esc(document.title)}, version ${esc(document.version)} in ERA Set of Specifications 3."><link rel="canonical" href="${canonical}"><link rel="stylesheet" href="styles.css"></head>
<body><header class="topbar"><a class="brand" href="./">Rail Specifications Evidence Search</a><nav><a href="./#documents">All documents</a><a href="legal.html">Sources &amp; reuse</a></nav></header>
<main class="knowledge-page"><div class="eyebrow"><span></span> ERA Set of Specifications 3</div><p class="knowledge-index">Index ${esc(document.index)}</p><h1>${esc(document.reference)}</h1><h2>${esc(document.title)}</h2><dl><div><dt>Approved version</dt><dd>${esc(document.version)}</dd></div><div><dt>Format</dt><dd>${esc(document.type)}</dd></div><div><dt>ERA note</dt><dd>${esc(document.note)}</dd></div><div><dt>Catalogue source</dt><dd>European Union Agency for Railways</dd></div></dl><a class="primary knowledge-download" href="${esc(document.url)}">Open authoritative ${esc(document.type)} at ERA <span aria-hidden="true">↗</span></a>${retrieval}<p class="source-notice">This page provides catalogue metadata and links to the ERA-hosted source. It does not assert permission to republish third-party content. See <a href="legal.html">Sources &amp; reuse</a>.</p></main>
<footer><a class="brand" href="./">Rail Specifications Evidence Search</a><p>Independent project. Not affiliated with or endorsed by ERA, the European Union, UNISIG, ETSI or UIC.</p><a href="legal.html">Sources &amp; reuse</a></footer></body></html>`);
}

fs.writeFileSync('era-documents.json', `${JSON.stringify(documents, null, 2)}\n`);
const urls = [`${SITE}/`, `${SITE}/subset-098-rag.html`, `${SITE}/legal.html`, ...documents.map(document => `${SITE}/${document.page}`)];
fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Generated ${documents.length} catalogue pages without institutional logos.`);
