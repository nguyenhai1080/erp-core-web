# Project execution workspace — v0.6.9

v0.6.10 adds project PDF evidence and contract preparation; see
`PROJECT_EVIDENCE_CONTRACTS.md`. Formal milestone acceptance remains closed.

GST owner login is verified. v0.6.8 added the initial 0006 command/UI slice;
v0.6.9 adds milestone return/cancellation. Formal milestone acceptance,
contract/evidence workflows and business UAT
remain outstanding.

## Owner workflow

1. Open Dự án. Create a partner, then a project (owner is the current user).
2. Open that project. Issue a budget with currency, exact amount and reason.
3. Create planned milestones; update actual start/progress and optionally submit
   at 100% with an actual end date. Submission is not formal acceptance.
4. Enter draft costs, optionally linked to a milestone. Currency/amount are explicit.
5. Review a cost, choose Duyệt or Huỷ, enter a reason and confirm.
6. Review current budget, approved costs and remaining budget per currency.
7. Return a submitted milestone for correction with a reason, then edit and
   resubmit it. Actual dates/progress are preserved when returning it.
8. Cancel a planned/in-progress/submitted milestone with a reason. Its record
   remains in history; accepted and already cancelled milestones are locked.
   Resolve approved linked costs before cancellation. Draft costs linked to a
   cancelled milestone cannot be approved; cancel and replace those drafts.

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
  with valid actual dates and 100%). SUBMITTED may return to IN_PROGRESS with a
  reason. PLANNED/IN_PROGRESS/SUBMITTED may become CANCELLED with a reason, only
  if no approved linked cost remains. ACCEPTED/CANCELLED cannot reopen.
- Return/cancel use project row locking, stale-version checks and transactional
  audit. Cancellation racing linked cost approval allows only one success, so an
  approved cost cannot end up linked to a cancelled milestone through commands.
- The acceptance checklist exposes project IN_PROGRESS/UAT and a linked MAIN
  contract with ACTIVE status. Contract results require CONTRACT_VIEW; the whole
  checklist requires MILESTONE_VIEW. This is informational, not authorization to
  accept: evidence access, contract dates and formal acceptance remain pending.
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

Staging rollout on 2026-10-08: API provider version 15 and UI provider version 9
both built source `4a338f8c` and passed their public HTTP 200 health gates. Direct
API `/api/v1/health` returned `status: ok`, `database: connected`. The public UI
shows v0.6.8, company default GST and an operational service. A successful 217 KB
managed data backup was taken before rollout, labelled “Trước v0.6.8 — GST, tài
khoản quản trị đã đăng nhập thành công”. No new schema migration or database
instance was required. The owner's staging login was confirmed before rollout;
the agent's browser is signed out, so authenticated business UAT on staging
remains for the GST owner. All browser write fixtures above used disposable local
data only. Refresh the UI and open Dự án to begin that UAT.

## Remaining in 0006

Formal acceptance with active project/contract and accessible evidence;
project activation/contract linking; user/role management;
business pagination/search and GST owner UAT. Continue those before marking the
whole 0006 pack complete or moving to invoice/ledger accounting.

## v0.6.9 validation — 2026-10-08

81 execution integration checks and 52 authentication checks passed against
disposable local databases. Workspace build passed. Local browser validation
submitted a milestone at 100%, returned it with a reason, then cancelled a second
milestone; statuses persisted after reload and approved cost totals were unchanged.
New integration checks include permission denial, cross-company scope, stale
writes, accepted/cancelled finality, cost-cancellation races and checklist privacy.
There is no new migration, permission or database instance in this patch.

Staging: API provider v16 and UI provider v11 built `a47329c5` and passed public
HTTP 200 health gates. API health returned `status: ok`, `database: connected`;
UI displays v0.6.9 and defaults to GST. A 220 KB managed PostgreSQL backup
labelled “Trước v0.6.9 — trả lại và huỷ mốc, giữ nguyên dữ liệu GST” completed
successfully. Authenticated GST business UAT remains with the owner; the agent
verified the new write workflow only against the disposable local fixture.
