# SUBSET-098 Microsoft Copilot acceptance baseline

Date: 2026-08-13

Environment: Microsoft 365 Copilot Chat (basic assistant) with commercial data protection. Prompts were generated locally from the SUBSET-098 v3.0.0 retrieval index. No PDF or local index was uploaded.

## Result

All ten representative retrieval-and-generation tests passed.

| Test | Result | Verified behavior |
| --- | --- | --- |
| Complete SAI header definition | Pass | Field order, TTS and EC variants, byte lengths, Big Endian encoding, and limits of available placement evidence |
| Closed network definition | Pass | EN 50159-1 definition separated from later KMAC usage rules |
| Open network definition | Pass | EN 50159-2 definition separated from later KMAC usage rules |
| KMAC deletion | Pass | KMC responsibility, deletion scope, archive exception, initiation, and RBC confirmation |
| KMAC update | Pass | Administrator decision, renewal/hazard triggers, maintenance and normal-operation contexts |
| KMAC distribution | Pass | Delivering/receiving responsibilities, KTRANS2 protection, secure installation and storage |
| SAI sequence number length | Pass | Two-byte, Big Endian encoding with correct clause citations |
| SAI data services | Pass | SAI-DATA.request and SAI-DATA.indication roles |
| SAI connection establishment | Pass | Four SAI-CONNECT primitives and the explicit SAI-to-Sa mapping limit |
| SAI error handling | Pass | Covered error classes, discard rules, release thresholds, retry behavior, and EC Alarm State |

## Acceptance criteria

- Material claims cite the applicable clause and PDF page.
- Answers stay within supplied evidence and state when detail cannot be confirmed.
- Flattened figure text is not used to invent byte boundaries or one-to-one primitive mappings.
- Definitions are distinguished from requirements that merely use the defined concept.
- Safety-related conclusions are not generalized beyond SUBSET-098 v3.0.0.

## Revalidation

Run the local retrieval suite first:

```powershell
node tests\subset-098-retrieval.test.js
```

After any material retrieval or prompt change, rerun at least the SAI header, KMAC deletion, and SAI error-handling prompts in an approved Microsoft Copilot Chat session.

