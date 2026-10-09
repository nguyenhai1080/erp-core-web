# DGC output reconciliation and Draft Invoice — v0.6.19

## Source and implemented flow

Authoritative donor: deployed DGC Apps Script v61; functions and UI references in DGC_OUTPUT_RECON_CORRECTED_WORKFLOW.md. The original donor is never executed. Tests use fabricated financial figures and synthetic images/templates only.

1. Upload source PDF with partner context, discover service/period, enforce duplicate/dependency guards, read and open review.
2. Show MZN/USD summary and child/TOTAL detail, commercial mapping and parser warnings. A permitted Revenue MZN correction recalculates WHT at 10%, MZN payable as revenue minus WHT, and each USD amount independently. Unchanged source USD values are preserved. A company-controlled composite signing image is positioned on actual visual CropBox/rotation coordinates; original bytes stay unchanged. Preview has no financial effects. Confirmation commits approved Reconciliation, Revenue, signed PDF/version and audit together. Database failure rolls back new files. Approved placement-only edits create another PDF version without changing finance.
3. Generate Draft Invoice from current approved TOTAL sources; expand CHILD rows for display, avoiding duplicate billing. Support consolidated or per-service invoices. Allocate each group's rounding residual to its last child, as DGC does. Preview original template-derived logo, bank data and current company/customer identity; position the same actual image; save PDF and XLSM/XLSX in private storage with provenance/version/actor/checksums. Old Draft revisions/files remain downloadable. Paid/non-Draft revisions are blocked pending AR/payment parity.

## Arithmetic, statuses and explicit deviations

- DGC management Gross/Net/CompanyShare equals Payable USD. Revenue/WHT/Payable USD invoice basis is separately snapshotted; it is not reconstructed by subtracting already-rounded USD amounts.
- Reconciliation APPROVED; Revenue INVOICE_READY and TOTAL inclusion correspond to donor directly approved invoice-ready revenue. CHILD rows are excluded from monthly/billing header totals.
- Invoice DRAFT only. No issue, cancellation, AR, payment, deletion or financial repair endpoint is supplied by this release.
- Default Invoice term: 45 days from DGC, configurable before preview. Owner's old GST Excel template used 15 days; UI names that difference. GST number format follows the supplied template: four-digit monthly sequence/mm/yyyy/GST/INV.
- Workbook adaptation freezes mapped invoice fields, dates, amounts and amount words. It preserves VBA/package drawings/source sheets without executing VBA. Numeric money is serialized as exact Decimal text. Existing unmapped template defects are not repaired implicitly. The original uploaded template is retained.
- Generated PDF uses the template's embedded logo/bank content and GST identity; it is a native document renderer, not a pixel-identical Excel print export. Workbook description is a combined multiline summary and aggregate amount in the existing template row.
- Owner-authorized composite image replaces donor's three independent image controls. No signature is generated or copied from DGC.
- Source layout coverage: exact six-column MZN/USD summaries, exact detail rows, single-service labelled columns, and strictly verified historical MOVTV monetary invariants. Full donor flexible OCR and grouped column-major fallbacks are not yet ported. Missing/ambiguous values and amount-word/footer discrepancies block finalization; no assumed missing gross/sharing values are fabricated.
- The supplied historical GST MOVTV scan is sideways despite PDF Rotate=0 and has unreliable hidden text. Temporary OCR raster orientation is corrected; source PDF remains unchanged. This reference still fails financial/word verification and must not be treated as an accepted finance import. No historical financial data was imported.
- Donor finalize commits finance before generating PDF; target wraps database effects and compensates new files on failure. Source/history and payment guards are intentionally stricter where full downstream parity is absent.

## Storage and deployment

Existing Vibe Host API persistent /app/storage only; no new hosting database. Originals output-recon/, signed PDFs signed-recon/, generated Invoice PDF/workbooks invoices/, versioned signing assets company-assets/, templates invoice-templates/, each under company UUID. All downloads require tenant and permission checks plus stored size/checksum/path validation. Migration 20261009140000 adds native Invoice headers/scopes and current finance uniqueness indexes. Back up database and application files before deploy; additive schema changes do not require changing GST records or credentials.

## Verification

- 41 donor arithmetic/parser characterization checks, including independent USD rounding, aggregate/child residuals, manual correction, strict historical/word mismatch rejection.
- 104 end-to-end financial checks on a disposable local PostgreSQL database: authorized/stale/CSRF/foreign-tenant cases, original-byte retention, signed preview without effects, approved re-stamp without extra Revenue, consolidated and actual per-service creation, source scopes, XLSM package preservation, concurrent creation, Draft revisions, paid guard, asset-change digest, failed second document group's complete DB/file rollback, all four PDF rotations with nonzero CropBox, actual HTTP proxy bytes/content types.
- Regressions: 76 intake, 103 PDF/scan/mixed-reader and 53 company asset checks.
- API/Web build and fresh-database migration verified. Synthetic generated PDFs rendered and visually inspected. Live UAT must use a newly selected valid business PDF and owner review; tests never finalize historical live financial records.
