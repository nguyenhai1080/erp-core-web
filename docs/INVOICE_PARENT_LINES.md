# Invoice service presentation

Owner instruction, 2026-10-09: only parent services appear on Invoice.
This explicitly overrides the DGC v61 Invoice child-expansion presentation.

New consolidated and per-service plans use TOTAL/include=true sources for
every visible line and preserve their approved Revenue/WHT/Payable amounts.
The same plan feeds preview, PDF and Excel. Child revenue remains available
for reconciliation review, revenue detail and Dashboard filters.

Existing PDFs and snapshots stay immutable. An existing unissued draft can
be regenerated through preview/confirmation, preserving the superseded copy.
Issued Invoices are not rewritten or migrated by this change.

Validation: API production build and 10 parent/child characterization checks.
Integration expectations updated for parent-only lines and filename fallback.
