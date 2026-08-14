# Rail Specifications Evidence Search

An independent, non-commercial, English-language evidence search tool for publicly accessible railway specifications. It runs as a static GitHub Pages site and uses deterministic browser-side retrieval: no AI model, paid API, server or company resource is required. The public interface uses no institutional logo.

Production site: https://zxj088.github.io/RAG-UNISIG-SUBSET/

The wider archive is catalogue metadata only until each document's reuse status and extraction quality are reviewed. Current searchable scope is SUBSET-098 v3.0.0.

The catalogue covers the 79 entries in ERA's archived Set of Specifications 3 (ETCS B3 R2 / GSM-R B1). Results preserve document, version, clause, PDF-page, and authoritative-source citations.

## Run locally

Serve the directory with any static HTTP server and open `index.html`. The public `subset-098-rag.html` Evidence Assistant automatically loads its same-origin published evidence; users never select or upload an index. Direct `file://` use is not supported because browsers block same-origin fetches from local files.

## Build a document index

Official PDFs and generated indexes are intentionally excluded from Git. Build schema-v2 evidence from a local PDF:

```powershell
python scripts/build-pdf-index.py path\to\source.pdf local-data\indexes\source-index.json `
  --document SUBSET-098 --title "RBC-RBC Safe Communication Interface" `
  --version 3.0.0 --source-url https://www.era.europa.eu/...
```

The retrieval engine accepts both existing schema-v1 indexes and new schema-v2 indexes. Published evidence is loaded automatically by the site.

## Tests

```powershell
node tests\evidence-assistant.test.js
node tests\subset-098-retrieval.test.js
node tests\production-site.test.js
```

The SUBSET-098 suite verifies ten representative questions covering SAI header structure, network definitions, connection establishment, key management, and error handling.

## Verification and rights

This project is not an engineering authority. Extracted text may contain processing errors; verify every material result against the authoritative source document. The project is not affiliated with, endorsed by, sponsored by, or maintained by ERA, the European Union, UNISIG, ETSI, or other document owners. Copyright and other rights remain with their respective holders.
