# Authoritative DGC output reconciliation workflow

Owner correction, 2026-10-08: inherit the updated review-and-finalize workflow, not the obsolete explanatory text that mentions separately uploading a signed file and BOD approval.

## Verified deployed v61 evidence

- `Index.html` `renderPdfReviewModal` (3138): OCR header, financial summary and service-detail results; manual Revenue MZN correction; original scan preview; draggable company stamp, signature and signer-title/name image; Confirm chốt file.
- `Index.html` `finalizeReconReviewStampUiV893` (3241): confirmation names three simultaneous effects: save corrected OCR, commit Revenue + Reconciliation, produce signed/stamped PDF. Calls `finalizeReconPdfReviewAndStampV893`.
- `22_Recon_PDF_Approval.js` `finalizeReconPdfReviewAndStampV893` (1164): Manager/BOD; optional corrections; import Revenue/Reconciliation; create a new signed PDF from the reviewed source; direct approval of related records; retain normalized placement and source history; Invoice is independent.
- `22_Recon_PDF_Approval.js` `DGC_defaultReconPlacementV882_` (625): normalized stamp, signature, signerTitleName image coordinates. Title/name is an image asset, not an invented text label. Actual visual page orientation/rotation must govern coordinates.
- `Index.html` `applyReconReviewPageMetaV894_` (3189): use actual visual PDF page aspect ratio rather than assumed portrait A4; preserve normalized drag coordinates.
- `Index.html` upload handlers: discover service/month from PDF, quick/full OCR duplicate guards, then automatically open review. Do not require service/month guesses as the primary upload interaction.
- `21_Recon_OCR.js` full parser and `22_Recon_PDF_Approval.js` manual corrections: grouped child services and aggregate rows; original MZN/USD summary authority; explicit warnings; no fabricated missing numbers. Manual revenue correction is the donor's defined recalculation, not an arbitrary new finance rule.
- `Index.html` Invoice workspace: separate third step, consolidated or per-service invoices from finalized revenue; preserve original source/signature history and duplicate/payment protections.

## Required target behavior

1. Upload one original PDF with partner context. Read service/month from the source. Resolve aliases unambiguously and enforce current duplicate/dependency guards before storing. Automatically open the uploaded document's review.
2. Review original scan AND full financial results. Preserve service-detail and summary tables in both MZN/USD; show source warnings and permitted manual Revenue MZN adjustments. Position the real company's three authorized image assets on the actual page. Confirm finalizes verified Revenue/Reconciliation and a new signed PDF, with actor/version/history and atomic failure behavior. Retain original PDF. Already-approved placement-only edits must not regenerate financial records.
3. Create Invoice from finalized revenue, preserving donor invoice modes and scope/payment guards.

## Current correction status

Working branch `fix/dgc-recon-workflow`, not deployed: PDF-derived service/month discovery before intake; automatic read/open-review; authenticated original page raster preview with actual orientation/aspect ratio; no guessed service/month controls in the primary upload form. Existing v0.6.17 source/history is retained.

**Not complete and not accepted parity:** full donor financial parsing/correction/mapping, stamp/signature/title asset configuration, coordinate placement/export, finalization transaction, approved placement-only edit, and Invoice runtime. These must be completed and verified before claiming the three-step workflow is implemented. No new release number or deployment is made for these preliminary corrections.

GST signing assets must be supplied/identified explicitly. Do not copy DGC/DIGICOM stamps or signatures into GST, invent signatures, alter permissions, or import live financial records as fixtures.
