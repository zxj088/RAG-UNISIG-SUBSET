import fs from 'node:fs';
const html = fs.readFileSync('era-source.html', 'utf8');
const clean = value => value.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
const documents = [];
for (const match of html.matchAll(/<tr[^>]*>([\s\S]*?<a href="(\/system\/files\/[^"]+)"[\s\S]*?)<\/tr>/gi)) {
  const row = match[1];
  const cells = [...row.matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(item => clean(item[1]));
  const link = row.match(/<a href="(\/system\/files\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  if (!link) continue;
  documents.push({index:cells[0]||'00',reference:cells[1]||'—',title:clean(link[2]),version:cells[3]||'—',note:cells[4]||'—',type:link[1].split('.').pop().toUpperCase(),url:`https://www.era.europa.eu${link[1]}`});
}
fs.writeFileSync('era-documents.json', `${JSON.stringify(documents, null, 2)}\n`);
console.log(`Extracted ${documents.length} ERA document links.`);
