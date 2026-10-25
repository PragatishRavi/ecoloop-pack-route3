# Architecture

The artefact is deliberately a static, dependency-light prototype. The architecture separates pure decision logic from browser interaction so the calculations can be tested independently.

## Canonical components

- `index.html` - semantic interface and module entry point
- `styles.css` - responsive and accessibility-focused presentation
- `core.mjs` - lifecycle, KPI, financial, threshold and validation functions
- `app.mjs` - local state, browser controls, exports/imports, QR handling and rendering
- `data/` - programme benchmarks, source register and evidence-gate definitions
- `assets/qr/` - EC-0001 to EC-0100 QR images
- `tests/core.test.mjs` - automated core test suite
- `STANDALONE_DEMO.html` - generated single-file convenience build

## Lifecycle

`Available -> Issued -> Returned -> Washed -> Inspected -> Available`

Exception paths:

- `Issued -> Lost`
- `Available/Returned/Washed/Inspected -> Retired`

A completed circulation is counted only when an inspected asset is made available again.

## Prototype boundary

The application uses browser `localStorage`; it is not a production multi-user system. A production implementation would require authentication, role permissions, server-side validation, durable database storage, audit logging, backup/recovery, security testing and institutional integration.
