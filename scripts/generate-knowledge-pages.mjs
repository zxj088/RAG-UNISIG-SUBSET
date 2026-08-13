import fs from 'node:fs';
const documents=JSON.parse(fs.readFileSync('era-documents.json','utf8'));
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const used=new Map();
for(const document of documents){
  const base=(document.reference!=='—'?document.reference:`index-${document.index}`).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const count=(used.get(base)||0)+1;used.set(base,count);const name=count===1?base:`${base}-${count}`;document.page=`${name}.html`;
  const canonical=`https://zxj088.github.io/subset/${document.page}`;
  const retrievalCanary=document.reference==='SUBSET-098'?'<section class="source-notice" aria-label="Copilot retrieval test"><h3>Copilot retrieval test</h3><p>This paragraph contains fictional test data used only to verify public website indexing. UNISIG retrieval test marker: <strong>ALPHA-RBC-300-2026</strong>. For this test, the fictional validation interval is <strong>47 seconds</strong>. This is not a requirement from SUBSET-098 and must not be treated as specification content.</p></section>':'';
  fs.writeFileSync(document.page,`<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(document.reference)} — ${esc(document.title)}</title><meta name="description" content="${esc(document.reference)}, ${esc(document.title)}, approved version ${esc(document.version)} in ERA Set of Specifications 3."><link rel="canonical" href="${canonical}"><link rel="stylesheet" href="styles.css"></head>
<body><header class="topbar"><a class="brand" href="./"><span class="brand-mark">U</span><span>UNISIG <b>Subset</b></span></a><nav><a href="./#documents">All documents</a></nav></header>
<main class="knowledge-page"><div class="eyebrow"><span></span> ERA Set of Specifications 3</div><p class="knowledge-index">Index ${esc(document.index)}</p><h1>${esc(document.reference)}</h1><h2>${esc(document.title)}</h2><dl><div><dt>Approved version</dt><dd>${esc(document.version)}</dd></div><div><dt>Format</dt><dd>${esc(document.type)}</dd></div><div><dt>ERA note</dt><dd>${esc(document.note)}</dd></div><div><dt>Source</dt><dd>European Union Agency for Railways</dd></div></dl><a class="primary knowledge-download" href="${esc(document.url)}">Open authoritative ${esc(document.type)} at ERA <span>↗</span></a><p class="source-notice">This catalogue page identifies the official document and links to its authoritative ERA-hosted copy. It does not reproduce the specification.</p></main>
<footer><a class="brand" href="./"><span class="brand-mark">U</span><span>UNISIG <b>Subset</b></span></a><p>Independent catalogue. Not affiliated with UNISIG or ERA.</p><span>© 2026</span></footer></body></html>`.replace('</main>',`${retrievalCanary}</main>`));
}
fs.writeFileSync('era-documents.json',`${JSON.stringify(documents,null,2)}\n`);
const urls=['https://zxj088.github.io/subset/',...documents.map(d=>`https://zxj088.github.io/subset/${d.page}`)];
fs.writeFileSync('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync('robots.txt','User-agent: *\nAllow: /\nSitemap: https://zxj088.github.io/subset/sitemap.xml\n');
console.log(`Generated ${documents.length} crawler-readable knowledge pages.`);
