import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber


CLAUSE_RE = re.compile(r"^(\d+(?:\.\d+){1,})\s+(.+)$")
TOKEN_RE = re.compile(r"[a-z0-9]+(?:[-'][a-z0-9]+)?", re.I)


def clean_lines(text: str, document: str) -> list[str]:
    lines = []
    for raw in text.splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        if not line:
            continue
        if "This document has been developed and released by UNISIG" in line:
            continue
        if document.lower() in line.lower() and re.search(r"Page\s+\d+\s*/\s*\d+", line, re.I):
            continue
        lines.append(line)
    return lines


def normalized(lines: list[str]) -> str:
    text = " ".join(lines)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a clause/page retrieval index from an ERA PDF.")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--document", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--skip-pages", type=int, default=0)
    parser.add_argument("--chunk-by-page", action="store_true")
    args = parser.parse_args()
    chunks = []
    current_clause = ""
    current_title = ""
    current_page = 0
    current_lines = []

    def flush() -> None:
        nonlocal current_lines
        text = normalized(current_lines)
        if len(text) >= 25:
            terms = Counter(TOKEN_RE.findall(f"{current_clause} {current_title} {text}".lower()))
            chunks.append({"clause": current_clause or None, "title": current_title or None,
                           "page": current_page, "text": text, "terms": dict(terms)})
        current_lines = []

    with pdfplumber.open(args.pdf) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            if page_number <= args.skip_pages:
                continue
            if args.chunk_by_page:
                flush()
                current_clause, current_title, current_page = "", f"PDF page {page_number}", page_number
            for line in clean_lines(page.extract_text(x_tolerance=2, y_tolerance=3) or "", args.document):
                match = CLAUSE_RE.match(line)
                if match and not args.chunk_by_page:
                    flush()
                    current_clause, current_title, current_page = match.group(1), match.group(2).strip(), page_number
                    current_lines = [line]
                else:
                    if not current_lines:
                        current_page = page_number
                    current_lines.append(line)
        flush()
        for sequence, chunk in enumerate(chunks, start=1):
            label = (chunk["clause"] or "page").replace(".", "-")
            chunk["id"] = f"{args.document.lower()}-{label}-p{chunk['page']}-{sequence}"
        payload = {"schemaVersion": 1, "document": args.document, "title": args.title,
                   "version": args.version, "sourceUrl": args.source_url,
                   "generatedAt": datetime.now(timezone.utc).isoformat(), "pageCount": len(pdf.pages),
                   "chunkCount": len(chunks), "chunks": chunks}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(chunks)} chunks from {payload['pageCount']} pages to {args.output}")


if __name__ == "__main__":
    main()
