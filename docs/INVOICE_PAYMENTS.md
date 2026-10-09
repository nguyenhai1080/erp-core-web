# Invoice payment adaptation — DGC deployed v61

Source: `51_Payment_Transaction.js` recordInvoicePayment, runtime guards, summary, transaction upsert, invoice status; `Index.html` openInvoicePaymentModal / recalcInvoicePaymentUi.

## Behavior
- Menu Phải thu is renamed Quản lý Công nợ; current coverage is AR from issued USD invoices.
- In Invoice, payment/history is available for current issued/partially paid/paid invoices. Posting requires PAYMENT_CREATE + PAYMENT_APPROVE + PAYMENT_POST; reading requires PAYMENT_VIEW. Existing role grants are not modified.
- Date, paid USD, actual received integer VND, calculated FX, SWIFT reference, optional original PDF/PNG/JPEG evidence, receiving account, method and note. Evidence is private company storage, immutable, checksum-verified, human-readable SWIFT filename; 5 MB and 20 million pixel limits.
- USD reduces Invoice/AR outstanding; VND is independently retained as the approved receipt amount. FX is informational and never recalculates source revenue or invoice totals.
- Atomic payment + invoice + AR + current billed TOTAL revenue status + audit + evidence. Historical/child rows are not reallocated or added to monthly revenue.
- Invoice must be current and issued, have exactly one balanced AR and valid current source scopes/reconciliation. Existing payments must equal the recorded paid balance. Draft, cancelled, superseded, stale and Paid invoices reject additional payment.
- Tenant filtering, origin/CSRF, shared financial-period lock, invoice row lock, expectedUpdatedAt, immutable request UUID/digest prevent cross-company writes, stale submission and duplicate retry. No payment edit/delete endpoint is provided.

## Explicit adaptations / remaining parity
- PostgreSQL transaction replaces Apps Script multi-sheet writes and retry repair. One immutable InvoicePayment row is the USD allocation and approved VND receipt, rather than duplicated 52/51 sheet rows. Existing GST records are untouched by the additive migration.
- The donor pins cash receipts to ACC0001 (must be active/VND). This release requires an explicit receiving-account identifier and retains VND receipts, but does not implement the full DGC account catalog, opening balances, arbitrary cash transactions, AP or SOA reporting. Dashboard cash balance remains unavailable; it must not treat invoice receipts alone as complete cash balance.
- Donor Manager/BOD authorization maps to three explicit payment permissions; no automatic grants or permission broadening.
- Donor allows overpayment up to 0.01 USD but its outstanding clamp can break exact AR balance. This release rejects any amount above outstanding, preserving original = paid + outstanding. The donor Paid threshold of remaining <=0.01 is retained; a residual cent is retained transparently rather than silently written off.
- Receipt records are immutable rather than donor Payment_ID overwrite behavior. Retries with the same request UUID and unchanged payload return the existing receipt; changed payload conflicts.

## Validation
`pnpm build`; additive migration applied to disposable local PostgreSQL database; Linux acceptance run `apps/api/tests/recon-invoice.integration.mjs`: 208 checks plus 67 DGC numerical characterization checks. Includes partial/full payments, overpay, missing permissions/CSRF, foreign company, stale source, concurrent same-request retries, evidence PDF/PNG exact bytes and forced downstream database failure rollback. No live payment is posted during deployment verification.
