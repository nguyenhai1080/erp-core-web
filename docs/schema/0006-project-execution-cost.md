# 0006 — Project Execution + Cost

Status: data foundation and initial authenticated commands/UI implemented in v0.6.8;
reasoned milestone return/cancellation and acceptance checklist added in v0.6.9.
See `../EXECUTION_COMMANDS.md` for the usable workflow and remaining scope.
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
The v0.6.8 commands enforce relevant permissions at runtime.

## Runtime rules and remaining work

Authenticated, company-scoped commands must enforce RBAC, attribute actions to the
current user, write AuditLog in the same transaction, and validate legal transitions.
Budget revision must retire the current version and create its replacement atomically.
Acceptance must check the active project/contract and evidence access; it must not
automatically create revenue or mark a billing trigger verified.
Reports sum only APPROVED costs per currency and show budget variance separately.
Cancelled entries remain available for audit, excluded from actual-cost totals.
Commands for budgets, costs, milestone progress/return/cancellation have integration
tests. Formal acceptance with contract and accessible evidence remains outstanding.

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
The backup verifier defaults to the historical v0.6.5 baseline (80/14).
For a newly seeded 0006 backup, pass `-ExpectedPermissions 92 -ExpectedSequences 16
-MinimumMigrations 2` to `scripts/verify-staging-backup.ps1`.

## Staging verification — 2026-10-07

- Source commit `3d6f4d1`: API deployment v7 passed the public health gate;
  startup logs identify release 0.6.6 and seed 92 permissions / 16 sequences.
- UI deployment v5 serves v0.6.6 with API/database connected. This update required
  a manual redeploy: the UI automatic-deploy switch was enabled but this push
  did not produce a UI deployment. Automatic UI delivery needs another check.
- Pre-migration backup (194 KB) was downloaded and restored before upgrade testing.
- Post-migration backup (214 KB) was downloaded to
  `C:\Users\Andy\Downloads\erp-core-web-staging-postgresql-20261007-2228.dump`.
  SHA256: `19B966742EAE3BD66D1119C56BAD8ECC0EED017400D16903B96E43A3E9D27EBC`.
- That backup restored into isolated local `erp_restore_acceptance_0006_staging`:
  DEFAULT, 92 permissions, 16 sequences, ADMIN with 92 permissions, 2 migrations.
  The 0006 SQL tests passed against the restored staging database; all fixtures
  rolled back. No business data was inserted into live staging for the tests.
- `ERP_SEED_ON_START=false` was saved after verification and takes effect on the
  next API deployment. Existing managed DB was reused; no extra staging DB created.

Business UAT is still pending. This is a verified schema release, not a completed
project execution workflow.
