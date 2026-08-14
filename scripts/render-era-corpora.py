import argparse
import html
import json
from pathlib import Path


def unpack(payload: dict) -> tuple[dict, list[dict]]:
    document = payload["document"] if isinstance(payload.get("document"), dict) else {
        "reference": payload["document"], "title": payload["title"], "version": payload["version"],
        "sourceUrl": payload["sourceUrl"]
    }
    return document, payload.get("blocks", payload.get("chunks", []))


def render(payload: dict, canonical: str) -> str:
    document, chunks = unpack(payload)
    articles = []
    for chunk in chunks:
        clause = chunk.get("clause") or "Unnumbered content"
        page = int(chunk.get("pdfPage", chunk.get("page")))
        articles.append(f'<article id="{html.escape(chunk["id"], quote=True)}"><h2>Clause {html.escape(clause)} — {html.escape(chunk.get("title") or "")}</h2><p><strong>Citation:</strong> {html.escape(document["reference"])} v{html.escape(document["version"])}, clause {html.escape(clause)}, PDF p.{page}</p><p>{html.escape(chunk["text"])}</p></article>')
    return f'''<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(document["reference"])} v{html.escape(document["version"])} evidence</title><meta name="robots" content="index,follow,max-snippet:-1"><link rel="canonical" href="{html.escape(canonical, quote=True)}"><link rel="stylesheet" href="styles.css"><style>main{{max-width:980px;margin:auto;padding:48px 24px}}article{{padding:20px 0;border-top:1px solid #dfe5e8}}article h2{{font-size:1.1rem}}article p{{line-height:1.6}}</style></head><body><main><h1>{html.escape(document["reference"])} v{html.escape(document["version"])}</h1><h2>{html.escape(document["title"])}</h2><p>Automatically extracted evidence for search. Verify engineering decisions against the <a href="{html.escape(document["sourceUrl"], quote=True)}">authoritative source</a>.</p>{''.join(articles)}</main></body></html>'''


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
        document, chunks = unpack(payload)
        filename = f"evidence-{index.name.removesuffix('-index.json')}.html"
        canonical = f"https://zxj088.github.io/subset/{filename}"
        (args.output / filename).write_text(render(payload, canonical), encoding="utf-8")
        pages.append({"file": filename, "url": canonical, "document": document["reference"],
                      "version": document["version"], "chunks": len(chunks), "pages": payload["pageCount"]})
    args.manifest.write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.sitemap:
        sitemap = args.sitemap.read_text(encoding="utf-8")
        sitemap = "\n".join(line for line in sitemap.splitlines() if "evidence-" not in line)
        entries = "\n".join(f"  <url><loc>{page['url']}</loc></url>" for page in pages)
        args.sitemap.write_text(sitemap.replace("</urlset>", f"{entries}\n</urlset>") + "\n", encoding="utf-8")
    print(f"Rendered {len(pages)} evidence pages")


if __name__ == "__main__":
    main()
