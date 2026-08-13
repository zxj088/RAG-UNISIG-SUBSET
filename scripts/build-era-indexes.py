import argparse
import json
import subprocess
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Build evidence indexes for every prepared ERA PDF.")
    parser.add_argument("report", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    sources = json.loads(args.report.read_text(encoding="utf-8"))
    builder = Path(__file__).with_name("build-pdf-index.py")
    results = []
    jobs = [(source, pdf) for source in sources if source["status"] == "ready" for pdf in source["pdfs"]]
    for number, (source, pdf) in enumerate(jobs, start=1):
        pdf_path = Path(pdf)
        suffix = f"-{number:03d}" if len(source["pdfs"]) > 1 else ""
        output = args.output / f"{source['stem']}{suffix}-index.json"
        if output.exists() and output.stat().st_size:
            results.append({"reference": source["reference"], "pdf": str(pdf_path), "index": str(output),
                            "status": "ready", "message": "Reused existing index"})
            continue
        command = [sys.executable, str(builder), str(pdf_path), str(output), "--document", source["reference"],
                   "--title", source["title"], "--version", source["version"], "--source-url", source["url"]]
        try:
            print(f"[{number}/{len(jobs)}] {source['reference']} :: {pdf_path.name}", flush=True)
        except OSError:
            pass
        completed = subprocess.run(command, capture_output=True, text=True, encoding="utf-8")
        results.append({"reference": source["reference"], "pdf": str(pdf_path), "index": str(output),
                        "status": "ready" if completed.returncode == 0 else "error",
                        "message": (completed.stdout or completed.stderr).strip()})
        (args.output / "index-build-report.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Built {sum(r['status'] == 'ready' for r in results)} of {len(results)} indexes")


if __name__ == "__main__":
    main()
