# Project execution workspace — v0.6.8

GST owner login is verified. This release adds the first usable 0006 command/UI
slice; formal milestone acceptance, contract/evidence workflows and business UAT
remain outstanding.

## Owner workflow

1. Open Dự án. Create a partner, then a project (owner is the current user).
2. Open that project. Issue a budget with currency, exact amount and reason.
3. Create planned milestones; update actual start/progress and optionally submit
   at 100% with an actual end date. Submission is not formal acceptance.
4. Enter draft costs, optionally linked to a milestone. Currency/amount are explicit.
5. Review a cost, choose Duyệt or Huỷ, enter a reason and confirm.
6. Review current budget, approved costs and remaining budget per currency.

Money inputs use a dot for the decimal separator, no thousands separator, at most
16 integer and 4 fractional digits. The server retains Decimal(20,4); UI financial
totals remain strings. A negative remaining budget is allowed and identifies an
overrun. Draft/cancelled costs are excluded; currencies are never combined.

## Enforcement

- Every write uses session authentication, command-specific permissions, exact
  UI Origin and session-bound CSRF. The server supplies company/actor IDs.
- Project reads/writes enforce company and owner scope; PROJECT_VIEW_ALL expands
  scope only inside the authenticated company. Foreign partners/milestones fail.
- Row locks serialize project commands. Budget commands require expected revision;
  cost and milestone transitions require expected updatedAt. Stale writes return 409.
- Retiring a budget and creating its replacement is one transaction. Snapshot
  history remains immutable. New costs reference the current same-currency budget.
- Each successful mutation and actor-attributed AuditLog is committed together.
  Sequence increments roll back with failed commands.
- Cost transition: DRAFT → APPROVED or CANCELLED; APPROVED → CANCELLED.
  Correction uses cancellation and a replacement draft, with audit reasons.
- Milestone transition: PLANNED → IN_PROGRESS → SUBMITTED (or direct submission
  with valid actual dates and 100%). Submitted/finalized milestones cannot be edited.
- Terminal projects reject new writes. No endpoint bypasses formal acceptance.
- Detail lists contain at most 100 recent records; totals aggregate every approved
  cost. Current budgets are supplied separately from truncated history.
- These records do not post AP, payments, ledger entries or revenue. Budget issuance
  is the COST_BUDGET_REVISE holder's explicit approval; no multi-stage approval yet.

## Validation

Build the API and web, then run `pnpm --filter @erp/api test:execution` with
DATABASE_URL targeting a disposable `erp_execution_acceptance_*` database that has
the four migrations and seeded permissions. The runner refuses other DB names.
Fixtures remain in that disposable database for inspection because finalized
financial history is protected from deletion. No fixtures are written to staging.
Also run the existing `test:auth` against its own `erp_auth_acceptance*` database.

Integration checks cover exact money/currency, scope, permissions, CSRF, legal
transitions, invalid dates, concurrent budget revision, concurrent numbering,
history preservation, stale writes and transactional audit attribution.
Local browser validation covers partner/project creation, budget issuance,
milestone creation/progress, draft cost and explicit approval with exact totals.

Validation on 2026-10-08: 51 execution integration checks and 52 auth checks passed.
Workspace build and Node 22 API Docker build passed. The local browser produced
budget 1000000.0001 VND, approved costs 300000.1234 VND and exact remaining
budget 699999.8767 VND; milestone progress 50% persisted across reload.

## Remaining in 0006

Formal acceptance with active project/contract and accessible evidence; milestone
cancellation/rework; project activation/contract linking; user/role management;
business pagination/search and GST owner UAT. Continue those before marking the
whole 0006 pack complete or moving to invoice/ledger accounting.
