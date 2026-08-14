const fs = require('node:fs');
const assert = require('node:assert/strict');
const {search} = require('../all-evidence-retrieval.js');
const index = JSON.parse(fs.readFileSync('all-evidence-index.json','utf8'));

assert.equal(index.documentCount, 87);
assert.equal(index.blockCount, 20049);
assert.equal(index.records.length, 20049);
assert(index.documents.every(document => document.reference && document.version && document.sourceUrl.startsWith('https://www.era.europa.eu/')));
assert(index.records.every(record => Number.isInteger(record.d) && Number.isInteger(record.p) && record.e));

const cases = [
  ['closed network','What is a closed network?','SUBSET-098'],
  ['braking','What requirements apply to braking?',null],
  ['key deletion','How are keys deleted?','SUBSET-098'],
  ['eurobalise','What dimensions apply to the ETCS Stop Marker?','06E068'],
  ['radio','What requirements apply to ETCS data only radio?','EIRENE FRS'],
  ['exact clause','SUBSET-098 clause 4.1.1.1.1','SUBSET-098']
];
for (const [name,question,expectedDocument] of cases) {
  const results = search(index,question);
  assert(results.length > 0, `${name}: no results`);
  if (expectedDocument) assert(results.some(result => result.document.reference === expectedDocument), `${name}: ${expectedDocument} missing`);
  assert(results.every(result => result.record.p > 0 && result.document.sourceUrl), `${name}: incomplete citation`);
}

const represented = new Set(index.records.map(record => record.d));
assert.equal(represented.size, 84, 'all evidence-bearing sources must be represented');
assert.equal(index.documents.filter(document => document.blocks === 0).length, 3, 'reserved empty sources must remain explicit');
console.log(`All-document search passed: ${index.blockCount} blocks across ${represented.size} evidence-bearing sources plus 3 reserved entries.`);
