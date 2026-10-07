# ReproCrowd rule pack — crowd-repro

**Version:** `1.0.0`
**URI:** `https://lukasroeseler.github.io/reprocrowd/crowd-repro/RULEPACK-v1.0.0.md`
**Status:** stable
**Maintainer:** ReproCrowd
**License:** CC BY 4.0
**Reference:** `reprocrowd/PROMPT.md`, `reprocrowd/WORKFLOW.md`

A ReproCrowd certification certifies **computational reproducibility** — that a paper's
shipped code and data can be re-executed and that the reported outputs recur. It is a
**Reproduction Study** (same methodology, same tools). It does **not** rule on whether the
science is correct; that is a separate robustness/replication question.

## Change log

- **1.0.0** (this version) — initial release. Six-phase workflow, six-step FORRT chain,
  computational-only outcome vocabulary, single sign-off file, FLoRA import mapping.

---

## 1. Purpose and scope
- Certify that the computation is reproducible and executable.
- Record, do not judge. Do **not** write "the paper is right/wrong"; write "the computation
  reproduced / did not reproduce the reported value X."
- Computational work only. No robustness or sensitivity analysis; that is out of scope.

## 2. The split
- Tools decide facts: real DOI, verbatim quote, did the run exit 0, does the value recur, is
  the term valid. A tool answer is final.
- The model proposes judgement: which sentence is the claim, the scope, how to phrase the outcome.

## 3. Copy, never touch
- Work on a copy (`working/`). Keep the shipped originals untouched (`extracted/`).
- Only **lossless, documented** edits to make it run (comment a hard-coded `setwd`, remove an
  unused archived dependency), and state exactly what changed and that no number changed.

## 4. Report both sides
- Report what reproduces and what does not, with exact numbers and the method used.
- A "cannot verify" needs the algorithm used, the numeric gap, and your judgement
  (algorithm difference vs data/analysis issue vs version drift).

## 5. Pin everything
- Header records: **repro standard version** (this rule pack version, e.g. `1.0.0`), **engine**
  (engine + model + provider), audit date, host OS, and the **procedure version** you ran.
- Record the **full program inventory**: every interpreter (R / Python / Stata / …) with its
  exact version, every package with its exact version, and the lockfile
  (`sessionInfo()`, `renv.lock`, `requirements.txt`, `pixi.lock`); flag version drift.
- Same header convention as a ReproAI report (`Engine: <engine> · rules: <version>`) plus the
  full environment block.

## 6. Enumerate claims first
- List every numeric claim (C1, C2, …) and the exhibits they map to; get the list approved
  before checking.

## 7. Verify, don't recall
- Quotes verbatim from the PDF (`verify_quote`); DOIs must resolve (`resolve_doi`); Wikidata
  terms must exist (`wikidata_lookup`); vocabulary terms from the template's enumeration.
- If a tool cannot confirm a value, it is not a value.

## 8. Audit the audit
- Re-read for internal contradictions. Every finding gets a cause and a suggested fix; every
  non-checkable item gets a reason.

## 9. Severity (by impact on the run)
- **P0** blocks the run / primary input missing.
- **P1** a primary statistic or DV not reproducible.
- **P2** a secondary result not exactly reproducible / documentation gap.
- **P3** hygiene (paths, README drift, naming).

## 10. Open by default
- Report, pipeline, and environment are public. Credit the codechecker (human or agent) and
  the model. This is what makes reports comparable and re-runnable.

## 11. Outcome vocabulary (computational, not robustness)
Map the result to exactly one of the FLoRA `outcome_computational` terms:
- `computationally reproducible` — the run re-executed and the reported outputs recurred.
- `computational issues` — it ran but some outputs did not recur / were flawed.
- `technical failure` — it could not be executed as shipped (missing code/data, fatal error).
- `computation not checked` — no computational verification was attempted (e.g. no code or
  data was shipped). Rare: a ReproCrowd certificate normally performs a run.

Always set `outcome_robustness = not checked`. A ReproCrowd certificate does not test
robustness (`robust` / `robustness challenges` are FLoRA terms for reproductions that did, and
are out of scope here); do not fill the robustness fields.

## 12. Output
- `certificate.json` (machine-readable), `certificate.md` (the human-readable report), and
  `flora-entry.json` (the FLoRA import record with the AI-generated tag and the GitHub URL).
- **`SIGN-OFF.md`** (see the template) is the **single** file the prompter reviews and signs; it
  records the repro standard version, engine, full program inventory, certification outcome,
  evidence, findings counts, and the FLoRA delivery.
