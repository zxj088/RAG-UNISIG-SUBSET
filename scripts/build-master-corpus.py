import argparse
import html
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("indexes", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    volumes = [{"size": 0, "blocks": [], "documents": set()} for _ in range(4)]
    payloads = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(args.indexes.glob("*-index.json"))]
    for payload in sorted(payloads, key=lambda item: sum(len(c["text"]) for c in item["chunks"]), reverse=True):
        volume = min(volumes, key=lambda item: item["size"])
        volume["documents"].add(f"{payload['document']} v{payload['version']}")
        for chunk in payload["chunks"]:
            clause = chunk.get("clause") or "Unnumbered content"
            page = int(chunk["page"])
            text = html.escape(chunk["text"])
            volume["blocks"].append(f'<article><h2>{html.escape(payload["document"])} v{html.escape(payload["version"])} — clause {html.escape(clause)}</h2><p><strong>Citation:</strong> {html.escape(payload["document"])} v{html.escape(payload["version"])}, clause {html.escape(clause)}, PDF p.{page}</p><p>{text}</p></article>')
            volume["size"] += len(chunk["text"])
    for number, volume in enumerate(volumes, start=1):
        filename = f"unisig-corpus-{number}.html"
        doc_list = ", ".join(sorted(volume["documents"]))
        page = f'''<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UNISIG evidence corpus volume {number}</title><meta name="robots" content="index,follow,max-snippet:-1"><link rel="canonical" href="https://zxj088.github.io/subset/{filename}"><style>main{{max-width:980px;margin:auto;padding:40px 20px}}article{{border-top:1px solid #ddd;padding:18px 0}}p{{line-height:1.55}}</style></head><body><main><h1>UNISIG evidence corpus volume {number} of 4</h1><p>Automatically extracted evidence. Verify engineering decisions against the authoritative ERA source linked from the document catalogue.</p><p><strong>Included documents:</strong> {html.escape(doc_list)}</p>{''.join(volume["blocks"])}</main></body></html>'''
        (args.output / filename).write_text(page, encoding="utf-8")
        print(filename, len(volume["blocks"]), volume["size"])


if __name__ == "__main__":
    main()
