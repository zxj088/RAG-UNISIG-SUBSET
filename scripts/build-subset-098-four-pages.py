import argparse
import html
import json
from pathlib import Path


def render(payload: dict, filename: str, start: int, end: int) -> str:
    chunks = [chunk for chunk in payload["chunks"] if start <= int(chunk["page"]) <= end]
    evidence = []
    for chunk in chunks:
        clause = chunk.get("clause") or "Unnumbered content"
        page = int(chunk["page"])
        evidence.append(f'''<article id="{html.escape(chunk["id"], quote=True)}" class="evidence-chunk" data-document="SUBSET-098" data-version="3.0.0" data-clause="{html.escape(clause, quote=True)}" data-pdf-page="{page}">
<h2>Clause {html.escape(clause)} — {html.escape(chunk.get("title") or "")}</h2>
<p class="citation"><strong>Citation:</strong> SUBSET-098 v3.0.0, clause {html.escape(clause)}, PDF p.{page}</p><p>{html.escape(chunk["text"])}</p></article>''')
    source = html.escape(payload["sourceUrl"], quote=True)
    return f'''<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SUBSET-098 v3.0.0 evidence — PDF pages {start}–{end}</title><meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><link rel="canonical" href="https://zxj088.github.io/RAG-UNISIG-SUBSET/{filename}"><link rel="stylesheet" href="styles.css">
<style>.corpus-shell{{max-width:980px;margin:0 auto;padding:48px 24px 80px}}.corpus-warning{{border-left:4px solid #d38b00;padding:14px 16px;background:#fff7df}}.evidence-chunk{{padding:22px 0;border-top:1px solid #dfe5e8}}.evidence-chunk h2{{font-size:1.15rem;margin:0 0 8px}}.evidence-chunk p{{line-height:1.65}}.citation{{color:#52666d}}</style></head><body>
<header class="topbar"><a class="brand" href="./">Rail Specifications Evidence Search</a></header>
<main class="corpus-shell"><div class="eyebrow"><span></span> Machine-readable evidence</div><h1>SUBSET-098 v3.0.0</h1><h2>PDF pages {start}–{end}</h2>
<p>Directly readable evidence for deterministic browser search. No external API or server is required.</p><p class="corpus-warning"><strong>Verification notice:</strong> Automatically extracted search evidence. Verify engineering decisions against the <a href="{source}">official ERA-hosted PDF</a>.</p>
<section aria-label="Extracted clause evidence">{''.join(evidence)}</section></main></body></html>'''


def main() -> None:
    parser = argparse.ArgumentParser(description="Build four URL-limited SUBSET-098 evidence pages.")
    parser.add_argument("index", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    payload = json.loads(args.index.read_text(encoding="utf-8"))
    volumes = [
        ("subset-098-corpus.html", 6, 31),
        ("subset-098-corpus-01.html", 32, 57),
        ("subset-098-corpus-02.html", 58, 87),
        ("subset-098-corpus-03.html", 88, 109),
    ]
    for filename, start, end in volumes:
        (args.output_dir / filename).write_text(render(payload, filename, start, end), encoding="utf-8")
    print("Wrote four URL-limited evidence pages covering PDF pages 6–109")


if __name__ == "__main__":
    main()
