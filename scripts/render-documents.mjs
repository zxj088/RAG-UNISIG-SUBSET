import fs from 'node:fs';

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const documents = JSON.parse(fs.readFileSync('era-documents.json', 'utf8'));
const rows = documents.map(document =>
  `        <a class="doc-row" href="${escapeHtml(document.page || document.url)}" data-search="${escapeHtml(`${document.index} ${document.reference} ${document.title} ${document.version} ${document.type}`.toLowerCase())}"><span class="doc-index">${escapeHtml(document.index)}</span><span class="doc-ref">${escapeHtml(document.reference)}</span><span class="doc-title">${escapeHtml(document.title)}</span><span class="doc-version">${escapeHtml(document.version)}</span><span class="doc-type">${escapeHtml(document.type)} →</span></a>`
).join('\n');

const path = 'index.html';
const html = fs.readFileSync(path, 'utf8');
const start = '        <!-- ERA_DOCUMENTS_START -->';
const end = '        <!-- ERA_DOCUMENTS_END -->';
const updated = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), `${start}\n${rows}\n${end}`);
if (updated === html) throw new Error('Document markers were not found or content was unchanged.');
fs.writeFileSync(path, updated);
console.log(`Rendered ${documents.length} document links into index.html.`);
