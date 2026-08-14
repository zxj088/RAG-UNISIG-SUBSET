import fs from 'node:fs';
import path from 'node:path';

const [sourceDirectory, outputFile = 'all-evidence-index.json'] = process.argv.slice(2);
if (!sourceDirectory) throw new Error('Usage: node scripts/build-public-search-index.mjs <indexes-directory> [output-file]');
const files = fs.readdirSync(sourceDirectory).filter(name => name.endsWith('-index.json')).sort();
const records = [];
const documents = [];
const stop = new Set('a an and are as at be by can do does for from how in into is it of on or that the this to what when where which who why with shall'.split(' '));
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

for (const file of files) {
  const payload = JSON.parse(fs.readFileSync(path.join(sourceDirectory, file), 'utf8'));
  const document = typeof payload.document === 'object' ? payload.document : {reference:payload.document,title:payload.title,version:payload.version,sourceUrl:payload.sourceUrl};
  const blocks = payload.blocks || payload.chunks || [];
  const documentIndex = documents.length;
  documents.push({reference:document.reference,title:document.title,version:document.version,sourceUrl:document.sourceUrl,pages:payload.pageCount,blocks:blocks.length});
  blocks.forEach((block, blockIndex) => {
    const text = clean(block.text);
    const title = clean(block.title);
    const terms = Object.entries(block.terms || {}).filter(([term,count]) => term.length > 2 && !stop.has(term) && count >= 2 && /^[a-z0-9][a-z0-9'-]*$/i.test(term)).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,80).map(([term])=>term);
    records.push({d:documentIndex,i:blockIndex,c:block.clause || null,p:Number(block.pdfPage || block.page),t:title || text.slice(0,150),e:text.slice(0,520),x:terms.join(' '),q:block.quality || 'normal'});
  });
}

const output = {schemaVersion:1,generatedAt:new Date().toISOString(),documentCount:documents.length,blockCount:records.length,documents,records};
fs.writeFileSync(outputFile, JSON.stringify(output));
console.log(`Built ${records.length} searchable evidence records from ${documents.length} indexes (${fs.statSync(outputFile).size} bytes).`);
