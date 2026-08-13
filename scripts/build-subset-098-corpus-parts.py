import argparse
import html
import json
import math
from pathlib import Path


def render_page(payload: dict, title: str, intro: str, chunks: list[dict], links: str = "") -> str:
    document = html.escape(payload["document"])
    version = html.escape(payload["version"])
    source_url = html.escape(payload["sourceUrl"], quote=True)
    sections = []
    for chunk in chunks:
        clause = chunk.get("clause") or "Unnumbered content"
        page = int(chunk["page"])
        sections.append(f'''<article id="{html.escape(chunk["id"], quote=True)}" class="evidence-chunk" data-document="{document}" data-version="{version}" data-clause="{html.escape(clause, quote=True)}" data-pdf-page="{page}">
<h2>Clause {html.escape(clause)} — {html.escape(chunk.get("title") or "")}</h2>
<p class="citation"><strong>Citation:</strong> {document} v{version}, clause {html.escape(clause)}, PDF p.{page}</p>
<p>{html.escape(chunk["text"])}</p></article>''')
    return f'''<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="robots" content="index,follow,max-snippet:-1"><link rel="stylesheet" href="styles.css">
<style>.corpus-shell{{max-width:980px;margin:0 auto;padding:48px 24px 80px}}.corpus-warning{{border-left:4px solid #d38b00;padding:14px 16px;background:#fff7df}}.corpus-links{{display:grid;gap:10px;margin:28px 0}}.evidence-chunk{{padding:22px 0;border-top:1px solid #dfe5e8}}.evidence-chunk h2{{font-size:1.15rem;margin:0 0 8px}}.evidence-chunk p{{line-height:1.65}}.citation{{color:#52666d}}</style></head>
<body><header class="topbar"><a class="brand" href="./"><span class="brand-mark">U</span><span>UNISIG <b>Subset</b></span></a><nav><a href="subset-098-corpus.html">Evidence hub</a></nav></header>
<main class="corpus-shell"><div class="eyebrow"><span></span> Machine-readable evidence</div><h1>{html.escape(title)}</h1><p>{html.escape(intro)}</p>
<p class="corpus-warning"><strong>Verification notice:</strong> Automatically extracted search evidence. Verify engineering decisions against the <a href="{source_url}">official ERA-hosted PDF</a>.</p>{links}
<section aria-label="Extracted clause evidence">{''.join(sections)}</section></main></body></html>'''


def main() -> None:
    parser = argparse.ArgumentParser(description="Split SUBSET-098 evidence into shallow crawler pages.")
    parser.add_argument("index", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    payload = json.loads(args.index.read_text(encoding="utf-8"))
    chunks = payload["chunks"]
    page_ranges = [(start, min(start + 9, payload["pageCount"])) for start in range(6, payload["pageCount"] + 1, 10)]
    link_items = []
    for number, (start, end) in enumerate(page_ranges, start=1):
        filename = f"subset-098-corpus-{number:02d}.html"
        selected = [chunk for chunk in chunks if start <= int(chunk["page"]) <= end]
        title = f"SUBSET-098 v3.0.0 evidence — PDF pages {start}–{end}"
        page = render_page(payload, title, f"Directly readable evidence blocks extracted from PDF pages {start} through {end}.", selected)
        (args.output_dir / filename).write_text(page, encoding="utf-8")
        link_items.append(f'<a href="{filename}">{html.escape(title)}</a>')
    links = '<nav class="corpus-links" aria-label="Evidence page index">' + ''.join(link_items) + '</nav>'
    hub = render_page(payload, "SUBSET-098 v3.0.0 evidence hub", "Select a compact evidence page. No JavaScript or JSON upload is required.", [], links)
    (args.output_dir / "subset-098-corpus.html").write_text(hub, encoding="utf-8")
    print(f"Wrote {len(page_ranges)} compact evidence pages and one hub")


if __name__ == "__main__":
    main()
