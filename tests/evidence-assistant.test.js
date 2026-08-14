const assert = require('node:assert/strict');
const {composeAnswer, detectIntent, normalizeIndex, retrieve} = require('../subset-098-retrieval.js');

const index = {
  schemaVersion: 2,
  document: {id: 'sample-v100', reference: 'SAMPLE', title: 'Sample specification', version: '1.0.0', sourceUrl: 'https://example.test/sample.pdf'},
  pageCount: 12,
  blockCount: 3,
  blocks: [
    {id: 'sample-3-1-p5-1', clause: '3.1', pdfPage: 5, title: 'Closed network definition', text: 'A closed network has a fixed number of participants.', terms: {closed: 2, network: 2, fixed: 1, participants: 1}, quality: 'normal', qualityFlags: []},
    {id: 'sample-3-2-p6-2', clause: '3.2', pdfPage: 6, title: 'Open network definition', text: 'An open network has an unknown number of participants.', terms: {open: 2, network: 2, unknown: 1, participants: 1}, quality: 'normal', qualityFlags: []},
    {id: 'sample-4-1-p8-3', clause: '4.1', pdfPage: 8, title: 'Connection establishment', text: 'The initiator shall establish the connection.', terms: {initiator: 1, shall: 1, establish: 2, connection: 2}, quality: 'normal', qualityFlags: []}
  ]
};

assert.equal(normalizeIndex(index).chunks.length, 3);
assert.equal(detectIntent('What is a closed network?'), 'definition');
assert.equal(detectIntent('Show clause 3.2'), 'clause-lookup');
assert.equal(detectIntent('How is the connection established?'), 'procedure');

const definition = retrieve(index, 'What is a closed network?');
assert.equal(definition[0].chunk.clause, '3.1');
const exact = retrieve(index, 'Show clause 3.2');
assert.equal(exact[0].chunk.clause, '3.2');
assert.deepEqual(retrieve(index, 'Show clause 3.2').map(result => result.chunk.id), exact.map(result => result.chunk.id));

const answer = composeAnswer(index, 'What is a closed network?', definition);
assert.equal(answer.confidence, 'High');
assert.equal(answer.evidence[0].document, 'SAMPLE');
assert.equal(answer.evidence[0].version, '1.0.0');
assert.equal(answer.evidence[0].pdfPage, 5);
assert.equal(answer.evidence[0].sourceUrl, 'https://example.test/sample.pdf');

const insufficient = composeAnswer(index, 'zyxwvu nonexistent terminology', retrieve(index, 'zyxwvu nonexistent terminology'));
assert.equal(insufficient.confidence, 'Insufficient');
assert.equal(insufficient.evidence.length, 0);
assert.match(insufficient.summary, /does not confirm/i);

console.log('All generic Evidence Assistant tests passed.');
