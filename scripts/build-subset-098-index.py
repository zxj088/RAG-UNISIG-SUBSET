import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber


SOURCE_URL = "https://www.era.europa.eu/system/files/2023-01/sos3_index063_-_subset-098_v300.pdf"
CLAUSE_RE = re.compile(r"^(\d+(?:\.\d+){1,})\s+(.+)$")
HEADING_RE = re.compile(r"^(\d+(?:\.\d+)*)\s+([A-Z][A-Za-z0-9 /(),&-]{2,})$")
FOOTER_RE = re.compile(r"Subset-098 v3\.0\.0.*Page \d+/109")
TOKEN_RE = re.compile(r"[a-z0-9]+(?:[-'][a-z0-9]+)?", re.I)


def clean_lines(text: str) -> list[str]:
    lines = []
    for raw in text.splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        if not line:
            continue
        if line == "© This document has been developed and released by UNISIG":
            continue
        if FOOTER_RE.search(line):
            continue
        lines.append(line)
    return lines


def normalize_text(lines: list[str]) -> str:
    text = " ".join(lines)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def make_chunk(clause: str, title: str, page: int, lines: list[str]) -> dict:
    text = normalize_text(lines)
    tokens = TOKEN_RE.findall(f"{clause} {title} {text}".lower())
    return {
        "id": f"ss098-{clause.replace('.', '-') if clause else 'page'}-p{page}",
        "clause": clause or None,
        "title": title or None,
        "page": page,
        "text": text,
        "terms": dict(Counter(tokens)),
    }


def extract_chunks(pdf_path: Path) -> tuple[int, list[dict]]:
    chunks: list[dict] = []
    current_clause = ""
    current_title = ""
    current_page = 0
    current_lines: list[str] = []

    def flush() -> None:
        nonlocal current_lines
        if current_lines and len(normalize_text(current_lines)) >= 25:
            chunks.append(make_chunk(current_clause, current_title, current_page, current_lines))
        current_lines = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            lines = clean_lines(page.extract_text(x_tolerance=2, y_tolerance=3) or "")
            if page_number <= 5:
                continue
            for line in lines:
                match = CLAUSE_RE.match(line) or HEADING_RE.match(line)
                if match:
                    flush()
                    current_clause = match.group(1)
                    current_title = match.group(2).strip()
                    current_page = page_number
                    current_lines = [line]
                else:
                    if not current_lines:
                        current_page = page_number
                    current_lines.append(line)
        flush()
        for sequence, chunk in enumerate(chunks, start=1):
            label = chunk["clause"].replace(".", "-") if chunk["clause"] else "page"
            chunk["id"] = f"ss098-{label}-p{chunk['page']}-{sequence}"
        return len(pdf.pages), chunks


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local SUBSET-098 clause retrieval index.")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    page_count, chunks = extract_chunks(args.pdf)
    payload = {
        "schemaVersion": 1,
        "document": "SUBSET-098",
        "title": "RBC-RBC Safe Communication Interface",
        "version": "3.0.0",
        "sourceUrl": SOURCE_URL,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "pageCount": page_count,
        "chunkCount": len(chunks),
        "chunks": chunks,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(chunks)} chunks from {page_count} pages to {args.output}")


if __name__ == "__main__":
    main()
