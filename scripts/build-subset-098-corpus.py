import argparse
import html
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a crawler-readable SUBSET-098 corpus page.")
    parser.add_argument("index", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    payload = json.loads(args.index.read_text(encoding="utf-8"))
    document = html.escape(payload["document"])
    version = html.escape(payload["version"])
    source_url = html.escape(payload["sourceUrl"], quote=True)
    sections = []
    for chunk in payload["chunks"]:
        clause = chunk.get("clause") or "Unnumbered content"
        heading = chunk.get("title") or ""
        page = int(chunk["page"])
        sections.append(f'''<article id="{html.escape(chunk["id"], quote=True)}" class="evidence-chunk" data-document="{document}" data-version="{version}" data-clause="{html.escape(clause, quote=True)}" data-pdf-page="{page}">
<h2>Clause {html.escape(clause)} — {html.escape(heading)}</h2>
<p class="citation"><strong>Citation:</strong> {document} v{version}, clause {html.escape(clause)}, PDF p.{page}</p>
<p>{html.escape(chunk["text"])}</p></article>''')
    output = f'''<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{document} v{version} — Crawler-readable evidence corpus</title>
<meta name="description" content="Crawler-readable clause evidence extracted from {document} v{version}, with clause and PDF-page citations.">
<meta name="robots" content="index,follow,max-snippet:-1"><link rel="canonical" href="https://zxj088.github.io/subset/subset-098-corpus.html"><link rel="stylesheet" href="styles.css">
<style>.corpus-shell{{max-width:980px;margin:0 auto;padding:48px 24px 80px}}.corpus-warning{{border-left:4px solid #d38b00;padding:14px 16px;background:#fff7df;line-height:1.55}}.evidence-chunk{{padding:22px 0;border-top:1px solid #dfe5e8}}.evidence-chunk h2{{font-size:1.15rem;margin:0 0 8px}}.evidence-chunk p{{line-height:1.65}}.citation{{color:#52666d}}</style></head>
<body><header class="topbar"><a class="brand" href="./"><span class="brand-mark">U</span><span>UNISIG <b>Subset</b></span></a><nav><a href="subset-098.html">SUBSET-098 catalogue</a></nav></header>
<main class="corpus-shell"><div class="eyebrow"><span></span> Machine-readable evidence</div><h1>{document} v{version}</h1><h2>{html.escape(payload["title"])}</h2>
<p>This static page exposes extracted document text directly in HTML so enterprise search and Copilot crawlers can retrieve it without JavaScript or file uploads. Each block carries its document version, clause and PDF-page citation.</p>
<p class="corpus-warning"><strong>Verification notice:</strong> This is automatically extracted search evidence, not the authoritative specification. Figures and tables may have imperfect reading order. Verify engineering decisions against the <a href="{source_url}">official ERA-hosted PDF</a>.</p>
<p><strong>Document:</strong> {document} &nbsp; <strong>Version:</strong> {version} &nbsp; <strong>PDF pages:</strong> {payload["pageCount"]} &nbsp; <strong>Evidence blocks:</strong> {len(sections)}</p>
<section aria-label="Extracted clause evidence">{''.join(sections)}</section></main>
<footer><a class="brand" href="./"><span class="brand-mark">U</span><span>UNISIG <b>Subset</b></span></a><p>Independent retrieval aid. Not affiliated with UNISIG or ERA.</p><span>2026</span></footer></body></html>'''
    args.output.write_text(output, encoding="utf-8")
    print(f"Wrote {len(sections)} evidence blocks to {args.output}")


if __name__ == "__main__":
    main()
