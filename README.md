# EcoLoop Pack — Route 3 Business Plan Artefact

**Student:** Pragathish Ravi  
**Module:** 7001SOM Postgraduate Project — Route 3  
**Project:** EcoLoop Pack — Evidence-Led Business Plan and Pilot Operations & Feasibility System

EcoLoop Pack is a proposed managed reusable takeaway-container service for dense institutional foodservice sites. This repository contains the functional artefact and selected supporting evidence used to evaluate whether the proposed service should progress from a controlled pilot to a scale review.

## Artefact

`index.html` is the canonical application and is designed for GitHub Pages or a local web server.

The prototype records container lifecycle events, uptake and return as separate KPIs, washing/inspection states, loss/retirement, evidence readiness and conditional site economics. External benchmark data are kept separate from local prototype/pilot records.

## Repository map

- `index.html` — main artefact
- `app.mjs` / `core.mjs` — browser logic and independently testable business rules
- `styles.css` — responsive interface styling
- `data/` — benchmark programmes, source register and evidence gates
- `assets/qr/` — demonstration container QR assets
- `tests/` — automated core tests
- `docs/` — architecture, manual testing and research-to-artefact traceability
- `evidence/` — selected research, source-validation and financial-planning evidence
- `posters/` — academic project posters
- `report/` — report metadata only; the assessed report is submitted separately through Aula

## Run locally

```bash
python3 serve.py
```

Then open the local address printed in the terminal.

## Automated checks

```bash
node --check app.mjs
node --check core.mjs
node --test tests/core.test.mjs
```

GitHub Actions runs these checks automatically on pushes and pull requests.

## Evidence boundary

This repository does **not** claim that EcoLoop Pack has already achieved a commercial return rate, profit, adoption rate or carbon saving. Public and peer-reviewed figures are retained as external benchmarks. Management planning assumptions are labelled separately from observed/current evidence.

## Submission boundary

The final 7001SOM business plan, ethics certificate and supervisor correspondence are intentionally not published in this public repository. They are submitted through the university's designated assessment routes.
