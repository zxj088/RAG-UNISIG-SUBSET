const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {composeAnswer, retrieve} = require('../subset-098-retrieval.js');
const indexPath = process.env.RAG_INDEX_PATH || path.resolve(__dirname, '../local-data/subset-098-v300-index.json');
if (!fs.existsSync(indexPath)) throw new Error(`Local index missing: ${indexPath}`);
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const cases = [
  {name:'complete SAI header definition',question:'How is the SAI header structured for safe data transfer?',required:['5.4.4.1.5','5.4.4.1.6','5.4.4.1.7','5.4.4.1.8','5.4.4.1.9','5.4.4.1.10','5.4.4.1.11','5.4.4.1.12','5.4.4.1.13','5.4.5.3.4','5.4.9.3.10'],pages:[21,22,24,46]},
  {name:'closed network definition',question:'What is a closed network?',required:['4.1.1.1.1'],pages:[9]},
  {name:'key deletion',question:'How are keys deleted?',required:['7.4.7.6.1','7.4.7.6.2','7.4.7.6.3','7.4.7.6.4'],pages:[107]},
  {name:'KMAC update',question:'When and how is KMAC updated?',required:['7.4.7.5.1','7.4.7.5.2'],pages:[107]},
  {name:'sequence number length',question:'How long is the SAI sequence number field?',required:['5.4.4.1.7'],pages:[21]},
  {name:'SAI data services',question:'Which SAI services transfer application data?',required:['5.4.2.1.4'],pages:[19]}
  ,{name:'open network definition',question:'What defines an open network?',required:['4.1.1.1.2'],pages:[9]}
  ,{name:'KMAC distribution',question:'How is KMAC distributed?',required:['7.4.7.4.1','7.4.7.4.2','7.4.7.4.3','7.4.7.4.4','7.4.7.4.5'],pages:[107]}
  ,{name:'SAI connection establishment',question:'How is an SAI connection established?',required:['5.4.2.1.3','5.4.5.1.2'],pages:[18,23]}
  ,{name:'SAI error handling',question:'Which errors are covered by SAI error handling?',required:['5.4.10.1.1','5.4.10.1.2','5.4.10.1.3','5.4.10.1.4','5.4.10.1.5','5.4.10.1.6','5.4.10.1.7'],pages:[52,53]}
];
let failures = 0;
for (const testCase of cases) {
  const results = retrieve(index, testCase.question);
  const clauses = new Set(results.map(result => result.chunk.clause));
  const pages = new Set(results.map(result => result.chunk.page));
  const missingClauses = testCase.required.filter(clause => !clauses.has(clause));
  const missingPages = testCase.pages.filter(page => !pages.has(page));
  try {
    assert.deepEqual(missingClauses, []); assert.deepEqual(missingPages, []);
    const answer = composeAnswer(index, testCase.question, results);
    assert.notEqual(answer.confidence, 'Insufficient');
    assert.ok(answer.evidence.length > 0);
    assert.ok(answer.evidence.every(item => item.document === 'SUBSET-098'));
    assert.ok(answer.evidence.every(item => item.version === index.version));
    assert.ok(answer.evidence.every(item => Number.isInteger(item.pdfPage)));
    assert.ok(answer.evidence.every(item => item.sourceUrl === index.sourceUrl));
    console.log(`PASS ${testCase.name} (${results.length} evidence chunks)`);
  } catch {
    failures += 1; console.error(`FAIL ${testCase.name}`);
    if (missingClauses.length) console.error(`  Missing clauses: ${missingClauses.join(', ')}`);
    if (missingPages.length) console.error(`  Missing pages: ${missingPages.join(', ')}`);
    console.error(`  Returned: ${[...clauses].join(', ')}`);
  }
}
if (failures) process.exitCode = 1;
else console.log(`All ${cases.length} retrieval regression tests passed.`);
