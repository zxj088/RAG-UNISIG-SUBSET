import fs from 'node:fs';

const SITE = 'https://zxj088.github.io/RAG-UNISIG-SUBSET';
const files = fs.readdirSync('.').filter(name => name.endsWith('.html'));
let changed = 0;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replaceAll('https://zxj088.github.io/subset/', `${SITE}/`)
    .replaceAll('https://github.com/zxj088/subset', 'https://github.com/zxj088/RAG-UNISIG-SUBSET')
    .replaceAll('<span class="brand-mark">U</span><span>UNISIG <b>Subset</b></span>', 'Rail Specifications Evidence Search');

  const isMachineCorpus = file.startsWith('evidence-') || file.startsWith('unisig-corpus-') || file.startsWith('subset-098-corpus');
  if (isMachineCorpus) {
    if (/<meta name="robots"[^>]*>/i.test(html)) {
      html = html.replace(/<meta name="robots"[^>]*>/i, '<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">');
    } else {
      html = html.replace(/<head>/i, '<head><meta name="robots" content="noindex,nofollow,noarchive,nosnippet">');
    }
  }
  if (html !== before) {
    fs.writeFileSync(file, html);
    changed += 1;
  }
}

console.log(`Hardened ${changed} public HTML artifacts.`);

const stylesheet = 'styles.css';
let css = fs.readFileSync(stylesheet, 'utf8');
css = css.replace(/\.brand-mark\{[^}]*\}/g, '')
  .replaceAll('DM Mono', 'ui-monospace')
  .replaceAll('Manrope', 'Arial');
fs.writeFileSync(stylesheet, css);
console.log('Removed legacy logo styling and external font names.');
