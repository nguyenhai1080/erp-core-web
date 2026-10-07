# 0006 — Project Execution + Cost

Status: data foundation implemented; authenticated commands and business UI pending.
This follows the schema-pack approach of 0002–0005. It does not introduce public
financial write endpoints or claim that user acceptance testing is complete.

## Models and conventions

- `ProjectMilestone`: planned/actual dates, progress, submission and acceptance evidence.
- `ProjectCostBudget`: approved budget snapshot, revision number and one current
  revision per project/currency. Retire and replace snapshots transactionally.
- `ProjectCostEntry`: dated expense with category, optional milestone/budget,
  source reference, draft/approved/cancelled status.

Progress uses a fraction from 0 to 1, consistent with the existing Project schema.
Amounts use Decimal(20,4); currency is an uppercase three-letter code.
Costs are non-negative. Corrections cancel the old entry and create a replacement;
refund/credit-note accounting is deferred to the invoice/ledger packs.
Cost entries describe project costs, not posted accounting transactions or AP.
Amounts from different currencies must never be summed without an explicit FX policy.
Over-budget costs are permitted and should be reported as variance, not silently rejected.

## Enforced in PostgreSQL

- Composite foreign keys bind each new record to the same company and project.
- Optional milestone and budget references cannot point to another project;
  a budget reference also requires the same currency.
- Date ordering, progress, amount, currency and positive revision checks.
- Acceptance requires complete progress, actual end date, timestamp and evidence reference.
- Approved costs require an approval timestamp. Finalized costs cannot be deleted,
  rewritten or returned to draft; an approved entry may be cancelled.
- Budget snapshots cannot be rewritten or deleted; only `isCurrent` can change.
- Partial unique index prevents concurrent current budgets in one project/currency.

The companion SQL is included in migration
`20261007140000_project_execution_cost`; do not run it a second time.
Previous applied migrations are unchanged. The earlier packs' companion constraint
files are separate historical references; this change does not retroactively apply them.

## Seed and permissions

Seed adds 12 milestone/cost/budget permission codes and two sequences:
`PROJECT_COST` and `PROJECT_MILESTONE`. Fresh DEFAULT baseline is 92 permissions
and 16 sequences. Repeated seed preserves existing sequence counters and records.
Permission definitions do not constitute runtime RBAC enforcement.

## Runtime work still required before business UAT

Authenticated, company-scoped commands must enforce RBAC, attribute actions to the
current user, write AuditLog in the same transaction, and validate legal transitions.
Budget revision must retire the current version and create its replacement atomically.
Acceptance must check the active project/contract and evidence access; it must not
automatically create revenue or mark a billing trigger verified.
Reports sum only APPROVED costs per currency and show budget variance separately.
Cancelled entries remain available for audit, excluded from actual-cost totals.
These rules need integration tests when the commands are implemented.

## Local verification

Use an isolated database restored from the staging baseline, with DATABASE_URL
pointing to that database. Then run:

```powershell
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:generate
pnpm build
docker cp packages/db/prisma/tests/0006_execution_cost.sql erp-core-postgres:/tmp/0006_execution_cost.sql
docker exec erp-core-postgres psql -U erp -d erp_0006_acceptance -f /tmp/0006_execution_cost.sql
```

The SQL test rolls back all fixtures. It checks 20 invalid writes plus successful
acceptance, budget revision, cancellation, exact Decimal values and deletion of a draft.
The v0.6.5 backup verifier retains its historical 80/14 baseline assertions;
it is for the pre-0006 backup, not a newly seeded 0006 backup.
