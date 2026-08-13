import argparse
import json
import re
import urllib.request
import zipfile
from pathlib import Path


def safe_name(value: str) -> str:
    value = value.lower().replace("/", "-")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-") or "reference"


def download(url: str, target: Path) -> None:
    if target.exists() and target.stat().st_size:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "UNISIG-Subset evidence builder/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        target.write_bytes(response.read())


def main() -> None:
    parser = argparse.ArgumentParser(description="Download and inventory authoritative ERA source packages.")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    documents = json.loads(args.manifest.read_text(encoding="utf-8"))
    report = []
    for number, item in enumerate(documents, start=1):
        stem = safe_name(item.get("page", "").removesuffix(".html") or item["reference"])
        extension = item["type"].lower()
        package = args.output / "packages" / f"{stem}.{extension}"
        record = {"reference": item["reference"], "version": item["version"], "title": item["title"],
                  "type": item["type"], "url": item["url"], "page": item["page"], "stem": stem,
                  "package": str(package), "pdfs": [], "status": "pending"}
        try:
            try:
                print(f"[{number}/{len(documents)}] {item['reference']} {item['type']}", flush=True)
            except OSError:
                pass
            download(item["url"], package)
            if item["type"] == "PDF":
                record["pdfs"] = [str(package)]
            elif item["type"] == "ZIP":
                extract_dir = args.output / "extracted" / stem
                extract_dir.mkdir(parents=True, exist_ok=True)
                with zipfile.ZipFile(package) as archive:
                    for member in archive.infolist():
                        if member.filename.lower().endswith(".pdf"):
                            name = Path(member.filename).name
                            target = extract_dir / name
                            if not target.exists():
                                target.write_bytes(archive.read(member))
                            record["pdfs"].append(str(target))
            record["status"] = "ready" if record["pdfs"] else "no-pdf"
        except Exception as error:
            record["status"] = "error"
            record["error"] = str(error)
        report.append(record)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Prepared {sum(r['status'] == 'ready' for r in report)} sources; "
          f"{sum(r['status'] == 'no-pdf' for r in report)} without PDFs; "
          f"{sum(r['status'] == 'error' for r in report)} errors")


if __name__ == "__main__":
    main()
