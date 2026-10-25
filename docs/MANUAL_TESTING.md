# Manual Acceptance Checklist

1. Run `python3 serve.py` and open the local address in a normal browser.
2. Confirm the interface loads with styling, source data and the QR area.
3. Load `EC-0001`.
4. Issue it and confirm the status becomes `Issued`.
5. Return, wash and inspect the container.
6. Confirm the status becomes `Inspected`, then choose `Make available`.
7. Confirm one completed cycle is added only at the final reissue step.
8. Issue a second container and mark it lost; confirm the Lost KPI increments.
9. Add a daily observation and confirm uptake changes independently of return.
10. Confirm median return time appears after at least one issue-return pair.
11. Enter all EcoLoop site-model fields and confirm cost, revenue, contribution and model-derived thresholds appear.
12. Confirm G4/G5 performance responds to entered model thresholds and recorded pilot data.
13. Set a manual quotation gate to `Quoted/contracted` without a note and confirm it does not count as evidence-ready.
14. Add an evidence reference and confirm the readiness count changes.
15. Export event CSV, uptake CSV and JSON evidence bundle.
16. Re-import the exported JSON and confirm state restoration.
17. Attempt malformed JSON/state and confirm rejection.
18. Check keyboard tab order and visible focus state.
19. Test QR camera scanning through localhost/HTTPS where supported; confirm manual ID fallback remains available.
20. Check desktop and mobile/narrow layouts.

Camera QR scanning is browser/device dependent and is not represented as universally compatible.
