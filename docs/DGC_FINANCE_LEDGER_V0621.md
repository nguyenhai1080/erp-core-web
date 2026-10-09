# v0.6.21: wrapped MEUBEAT service names and issued Invoice receivables

## Authoritative behavior

Grounded in deployed DGC Apps Script v61: `40_Invoice_Core.js`,
`DGC_getInvoiceIssuePlan_` (1026), `DGC_issueOneInvoiceFromPlan_` (1095),
`issueInvoice` (1146), and `50_ARAP.js`. Current DGC output finance uses
Invoice Payable USD as AR original amount, not raw reconciliation revenue.
Service-mode drafts for the same partner/month are issued together; a draft
does not create AR, and another issued billing mode must not double bill.

## Delivered runtime

- Revenue register defaults to approved, current TOTAL rows. CHILD rows can
  be shown but do not contribute to the total Payable USD.
- Issue preview verifies original source linkage, approved signed documents,
  Invoice PDF, line/header amounts and source freshness. Confirmation of
  already sending the Invoice is explicit; the application does not send email.
- Issuing requires INVOICE_ISSUE and CSRF. The reviewed digest must still
  match. Invoice, scope, TOTAL revenue, one AR per Invoice and audit writes
  commit atomically under company/partner/period locks.
- AR original and outstanding start at Invoice Payable USD; paid starts at
  zero. The register requires AR_VIEW. Its date filter computes aging of
  current balances, not historical balances. PDF links require INVOICE_VIEW.
- Schema change is additive. Existing drafts and finance are not backfilled
  or automatically issued. Approved PDF extraction is not overwritten.

## MEUBEAT PDF evidence

The owner-supplied `203379_Reconcile.pdf` has native text where MEUBEAT sits
above row 1 amounts and APP below. Standalone name fragments are joined only
inside the physical service-name column; the original PDF remains unchanged.
Local verification of that exact PDF returns MEUBEAT_APP and MEUBEAT_IVR
as CHILD and MEUBEAT as TOTAL, ready with no financial errors. Existing
unapproved uploads need Read again to refresh cached extraction. Unsupported
or incomplete child rows remain blocked rather than falling back to totals.
No live financial values or donor configuration are committed as fixtures.

## Validation

- Workspace production build passes.
- 67 parser characterization checks pass, including wrapped names,
  misleading neighboring text, missing IVR and inconsistent totals.
- 149 integration checks pass on disposable PostgreSQL databases using the
  Docker/native PDF runtime. They cover source/tenant/permission/CSRF checks,
  competing issue calls, stale digests, all-or-nothing batch rollback, no AR
  from drafts, exact AR values and aging boundaries, plus existing PDF,
  signature placement, revisions, Invoice template and proxy behavior.

## Remaining inherited scope

This is not full DGC finance parity: manual revenue entry/approval, simultaneous
reference drafts for alternate billing modes, payment and transaction posting,
Invoice cancellation, SOA, AP and full aging buckets remain separate work.
An already-issued request returns a conflict instead of DGC's no-op success.
Manager/BOD donor roles map to existing ERP permissions; no live grants change.
