# v0.6.22: recognizable financial document names

Owner-requested extension of DGC naming: finalized reconciliation PDFs and
Invoice PDF/workbooks include service name(s), revenue period, document
reference and revision. DGC v61 `22_Recon_PDF_Approval.js` includes service
and period in signed reconciliation names; `40_Invoice_Core.js` originally
uses Invoice number alone. The owner's request adds service/period to Invoice.

Examples:

- `Reconciliation_MEUBEAT_2026-01_RUP0005_v1.pdf`
- `Invoice_MOVTV_2026-01_0001_10_2026_GST_INV_v1.pdf`
- Consolidated Invoice: unique sorted parent service names separated by `+`.
- Excel uses the same basename, with the original `.xlsm` or `.xlsx` suffix.

New attachments store this display name. Downloads also derive readable names
for existing records without rewriting approved files or their financial data.
Invoice service labels are frozen in its snapshot; older snapshots fall back
to their line service names. Signed recon uses the selected service and period.

Path separators, control characters and unsafe characters cannot enter response
headers; names are normalized to ASCII. Long service lists are bounded and
retain a hash suffix. Physical storage remains UUID-based to avoid collisions
and preserve existing integrity checks and links.

Validation: production build, 67 parser checks and 155 integration checks pass.
Added checks verify signed metadata/download names, consolidated Invoice
PDF/Excel names, stored metadata, and older Invoice snapshot compatibility.
