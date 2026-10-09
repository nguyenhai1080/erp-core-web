# Draft document deletion — v0.6.25

User scope: both unapproved reconciliation PDFs and draft Invoices.

Donor: deployed-v61/40_Invoice_Core.js `deleteInvoice` (64–96) requires Manager/BOD, removes header/detail, trashes PDF and audits. Its legacy delete lacks the paid/approval guards present in regeneration/cancellation. Core deliberately restricts this action to current DRAFT, no issuedAt, zero paidAmount and no AccountReceivable, using existing INVOICE_CANCEL permission. No new grants. Issued/approved deletion is outside this request.

Donor reconciliation cleanup in 20_Recon_Core.js is repair/duplicate cleanup, not a general user delete. This requested extension only accepts UPLOADED/OCR_EXTRACTED/UNDER_REVIEW/REJECTED without any linked reconciliation or finalization. Existing RECON_CANCEL permission applies.

POST commands require same-origin, CSRF, explicit confirmed=true and expectedUpdatedAt. Company scoping, the shared finance partner/period advisory lock, and row locks serialize delete against finalize/issue. OCR completion rechecks status/revision to prevent resurrecting a cancelled upload. CANCELLED rows leave active lists; PDF/Excel/preview downloads stop. Database records and physical files remain as an audit tombstone rather than permanent storage erasure; no restore/purge UI is provided. This preserves provenance and backups. No live records are deleted as part of deployment.

Invoice scope/items are atomically deactivated/cancelled; approved revenue stays intact and available to create again. New revisions use the maximum across all historical invoices, including cancelled drafts, avoiding unique-key collisions after deletion. Cancelled upload hashes do not prevent re-uploading the original PDF.

Validation: API and UI production builds; 22 business guard characterization checks and parent-line regression. PostgreSQL integration suite requires the unavailable local Docker daemon; full database/race integration has not run for this release. Staging verification is non-destructive UI/health only.
