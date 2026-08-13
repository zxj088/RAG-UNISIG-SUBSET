import argparse
import html
import json
from pathlib import Path


def render(payload: dict, canonical: str) -> str:
    blocks = []
    for chunk in payload["chunks"]:
        clause = chunk.get("clause") or "Unnumbered content"
        page = int(chunk["page"])
        blocks.append(f'<article id="{html.escape(chunk["id"], quote=True)}"><h2>Clause {html.escape(clause)} — {html.escape(chunk.get("title") or "")}</h2><p><strong>Citation:</strong> {html.escape(payload["document"])} v{html.escape(payload["version"])}, clause {html.escape(clause)}, PDF p.{page}</p><p>{html.escape(chunk["text"])}</p></article>')
    return f'''<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(payload["document"])} v{html.escape(payload["version"])} evidence</title><meta name="robots" content="index,follow,max-snippet:-1"><link rel="canonical" href="{html.escape(canonical, quote=True)}"><link rel="stylesheet" href="styles.css"><style>main{{max-width:980px;margin:auto;padding:48px 24px}}article{{padding:20px 0;border-top:1px solid #dfe5e8}}article h2{{font-size:1.1rem}}article p{{line-height:1.6}}</style></head><body><main><h1>{html.escape(payload["document"])} v{html.escape(payload["version"])}</h1><h2>{html.escape(payload["title"])}</h2><p>Automatically extracted evidence for search. Verify engineering decisions against the <a href="{html.escape(payload["sourceUrl"], quote=True)}">authoritative source</a>.</p>{''.join(blocks)}</main></body></html>'''


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("indexes", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--sitemap", type=Path)
    args = parser.parse_args()
    pages = []
    for index in sorted(args.indexes.glob("*-index.json")):
        payload = json.loads(index.read_text(encoding="utf-8"))
        filename = f"evidence-{index.name.removesuffix('-index.json')}.html"
        canonical = f"https://zxj088.github.io/subset/{filename}"
        (args.output / filename).write_text(render(payload, canonical), encoding="utf-8")
        pages.append({"file": filename, "url": canonical, "document": payload["document"], "version": payload["version"], "chunks": payload["chunkCount"], "pages": payload["pageCount"]})
    args.manifest.write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.sitemap:
        sitemap = args.sitemap.read_text(encoding="utf-8")
        sitemap = "\n".join(line for line in sitemap.splitlines() if "evidence-" not in line)
        entries = "\n".join(f"  <url><loc>{page['url']}</loc></url>" for page in pages)
        sitemap = sitemap.replace("</urlset>", f"{entries}\n</urlset>")
        args.sitemap.write_text(sitemap + "\n", encoding="utf-8")
    print(f"Rendered {len(pages)} evidence pages")


if __name__ == "__main__":
    main()
