# Output reconciliation PDF intake — v0.6.16

This release delivers the first operational step of output reconciliation: receive and retain a source PDF, check duplicates/dependencies and list/download it. It does **not** deliver OCR, reviewed financial details, approval, stamping, revenue generation or replacement of financial chains. Those remain the next roadmap steps.

## Donor evidence and adaptations

Exact deployed DGC Apps Script version 61, read-only files in ignored artifacts/dgc-reference/deployed-v61. `20_Recon_Core.js`: DGC_normalizeServiceId_ (577), DGC_reconBusinessKeyV81180_ (1275), chain/replacement preflight (1275–1533), upload preflight and identity matching (1605–1758), quick preflight and NEED_FULL_OCR (1843–1978). `21_Recon_OCR.js` service/month identity parsing (147–235). `Index.html` quick scan, replacement confirmation, full OCR and review-modal upload path (2562–2805). Source hashes remain in DGC_SOURCE_INVENTORY.json. Donor source was read, never executed or published.

DGC's current UI selects partner and extracts service/month from the PDF. Target intake temporarily asks the operator for partner/service/month and explicitly stores identityVerified=false; selection is **not** verified PDF identity. Its new RUP source code is an intake identifier, not a donor Recon_Doc_ID. A future import must preserve donor identifiers and verify the PDF identity before any financial command. Contract candidates are company-scoped, Output/Active, date-effective and service-linked; no arbitrary first candidate is bound. Missing/ambiguous contracts do not turn intake into approval.

Business key uses immutable partnerKey, normalized immutable serviceKey and YYYY-MM. Editable codes cannot silently move an intake's identity. Existing source headers are retained. Preflight returns ALLOW_INTAKE, CONFIRM_REPLACE (receive a new source for review only) or BLOCK_FINANCIAL_DEPENDENCY. The confirmation does not supersede or cancel old PDFs/reconciliations/revenue. Current overlapping reconciliations with matching service or missing item provenance trigger confirmation. Inactive/superseded/rejected/cancelled sources do not count as current candidates.

Native Invoice/Payment parity does not yet exist. Therefore **any current InvoiceScope for the partner/month blocks intake**, including broken service provenance, except Cancelled/Superseded scopes. This is deliberately stricter than donor unpaid-invoice replacement; it never asserts that no payments exist. The donor behavior (paid chain blocks, unpaid current invoice marked Needs_Regeneration, old recon cancelled, old revenue excluded from totals) remains pending, not emulated by this upload step.

## Runtime and integrity

Additive output_recon_uploads table links the existing company/partner/service/user/Attachment tables. Migration does not convert or import existing GST records. List/reference/download require RECON_VIEW; upload/preflight require RECON_UPLOAD; receiving a PDF additionally requires RECON_VIEW. Existing permission provisioning stays unchanged. Origin/CSRF guard all uploads, IDs are company scoped, input is strict, month is 2000–2100, PDF limit is 5 MiB (7 MiB JSON transport). File magic/EOF checks establish basic format only, **not full PDF parse validity**.

Local STORAGE_ROOT persists source bytes under output-recon/company/UUID.pdf, exclusive writes, SHA256 and size checked on download, safe attachment response/no-store/nosniff. Audit stores metadata and operator, never PDF/base64. Failure after writing rolls back the file. Reference lists explicitly fail above 1000 choices.

Preflight fingerprints all current source/recon/scope/contract candidates. Upload rechecks inside a business-selection advisory lock, rejects stale fingerprints or unchanged duplicate bytes, and commits source/attachment/sequence/audit together. Future financial commands must take the same selection lock (or an equivalent shared concurrency protocol) before modifying the chain; the intake lock alone cannot serialize future invoice/payment commands. Partner/service delete guards now include intake references.

## Validation and rollout

Workspace build and additive migration on both disposable acceptance databases passed. 76 new checks cover donor service normalization, identity keys, periods, foreign IDs/auth/CSRF/permission revocation, strict/file validation, size limits, stale/parallel requests, retained history/no revenue effects, broken recon/invoice provenance, byte integrity/path safety, deletion guards, metadata audit and real HTTP UI proxy upload/download above the ordinary JSON limit. Existing 528 checks passed: 140 partners, 89 services, 100 service contracts, 81 execution, 66 evidence/proxy and 52 auth (604 total).

Local browser verified the receive form/preflight, fake PDF submission and resulting source row. Fake records remain in the named disposable database only. Staging rollout is backend/schema first, UI second, after successful database backup. Full DGC finance parity and live financial data migration are not claimed by this release.
