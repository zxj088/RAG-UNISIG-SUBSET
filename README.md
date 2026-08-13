# UNISIG Subset Explorer

A lightweight, static web interface for filtering, selecting, and exporting focused working sets of UNISIG requirements.

The site includes a searchable catalogue of all 79 files in ERA's archived Set of Specifications 3 (ETCS B3 R2 / GSM-R B1). Downloads link to the authoritative ERA-hosted files so revisions, attribution, and third-party publication rights remain with their source.

## Run locally

Open `index.html` in a browser or serve the directory with any static HTTP server.

## Publishing

The project is designed for GitHub Pages and is published from the repository root.

## Local SUBSET-098 retrieval prototype

The repository includes a local-only clause retrieval prototype for SUBSET-098 v3.0.0. The official PDF and generated text index are intentionally excluded from Git.

1. Download the authoritative PDF from the SUBSET-098 catalogue page and save it locally.
2. Build the index with the bundled Python runtime and `pdfplumber`:

   ```powershell
   python scripts/build-subset-098-index.py path\to\subset-098-v300.pdf local-data\subset-098-v300-index.json
   ```

3. Open `subset-098-rag.html` in a browser.
4. Load `local-data\subset-098-v300-index.json`, enter a question, and retrieve evidence.
5. Copy the generated grounded prompt into an approved Microsoft Copilot Chat session.

Run the local retrieval regression suite after rebuilding the index or changing ranking logic:

```powershell
node tests\subset-098-retrieval.test.js
```

The suite verifies required clauses and pages for ten representative questions, including SAI header structure, network definitions, connection establishment, key management, and error handling.

The prototype is a retrieval aid, not an engineering authority. Verify all results against the official ERA document.

> The included records are illustrative sample data and are not an authoritative UNISIG specification source.
