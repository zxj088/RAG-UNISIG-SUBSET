# SUBSET-098 evidence retrieval acceptance baseline

Date: 2026-08-14

Environment: deterministic, browser-compatible JavaScript retrieval over the local SUBSET-098 v3.0.0 evidence index. No AI model, external API, server, or company resource is used.

## Result

All ten representative retrieval tests pass.

| Test | Result | Required evidence behavior |
| --- | --- | --- |
| Complete SAI header definition | Pass | Return the verified field-definition clause bundle and relevant pages |
| Closed network definition | Pass | Return clause 4.1.1.1.1 and PDF page 9 |
| Open network definition | Pass | Return clause 4.1.1.1.2 and PDF page 9 |
| KMAC deletion | Pass | Return clauses 7.4.7.6.1–7.4.7.6.4 |
| KMAC update | Pass | Return clauses 7.4.7.5.1–7.4.7.5.2 |
| KMAC distribution | Pass | Return clauses 7.4.7.4.1–7.4.7.4.5 |
| SAI sequence number length | Pass | Return clause 5.4.4.1.7 and PDF page 21 |
| SAI data services | Pass | Return clause 5.4.2.1.4 and PDF page 19 |
| SAI connection establishment | Pass | Return clauses 5.4.2.1.3 and 5.4.5.1.2 |
| SAI error handling | Pass | Return clauses 5.4.10.1.1–5.4.10.1.7 |

## Acceptance criteria

- Results preserve document, version, clause, PDF page, and source URL.
- The assistant does not infer requirements beyond retrieved text.
- Missing evidence produces an explicit insufficient-evidence response.
- Flattened figure or table text is not used to invent field boundaries.
- Different document versions remain isolated.
- Identical input produces identical ordered results.

## Revalidation

```powershell
node tests\evidence-assistant.test.js
node tests\subset-098-retrieval.test.js
```
