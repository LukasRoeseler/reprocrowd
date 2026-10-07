# ReproCrowd

A crowdsourced platform for numerical reproductions. Researchers who care about the numerical
reproducibility of a paper in their field find a reprocheck prompt, feed it to the LLM they
already use, and submit a standardized report. The report is reviewed and signed by a human and
then shared with the field and fed into FLoRA with an AI tag.

A ReproCrowd report **certifies computational reproducibility** — a numerical/computational
outcome, not a robustness test. It never rules on whether the science is correct.

This repository hosts the public website (GitHub Pages) for ReproCrowd.

## Website

- `index.html` — what ReproCrowd is, the prompt, a submission + sign-off flow, and a searchable
  reproductions table linked to the [FLoRA Replication Atlas](https://forrt.org/flora-replication-atlas).
- `css/style.css`, `js/app.js` — styling and interactivity. The upload validates the
  self-reproducible bundle, collects a sign-off, and guides the user through saving the folder on
  GitHub as a pull request (the site itself is static; pushing happens via the shown git commands).
- `data/reproductions.json` — seed rows for the reproductions table.
- `hex-sticker.png` — the ReproCrowd hex sticker (transparent background, cropped from `logo.png`).
- `logo.png` — the full source logo.

## The workflow

The prompt, rule pack, and output format for a reproduction live in the companion
[`reprocrowd` package](https://github.com/LukasRoeseler/reprocrowd) (`PROMPT.md`,
`RULES.md`, `WORKFLOW.md`, `crowd-repro/RULEPACK-v1.0.0.md`, `certificate.schema.json`,
`flora-entry.schema.json`, `SIGN-OFF.md`).

## Licence

MIT.
