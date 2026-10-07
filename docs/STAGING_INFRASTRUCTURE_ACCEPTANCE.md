# Staging infrastructure acceptance — 2026-10-07

API: https://erp-core-web-staging.n1.tinhgon.xyz

UI: https://erp-core-staging-ui.n1.tinhgon.xyz

## Confirmed

- Local integration and staging database migration/seed passed.
- Both direct API and UI health proxy returned `status=ok`, `database=connected`.
- PostgreSQL backup downloaded as a custom-format PostgreSQL 16.15 archive.
- Restored with `pg_restore --no-owner --no-privileges --exit-on-error` into an
  isolated local acceptance database. Counts verified: DEFAULT company, 80
  permissions, 14 sequences, ADMIN role, 80 role permissions, one migration.
- Reusable verifier: `scripts/verify-staging-backup.ps1 -DumpPath <downloaded dump>`.
  It creates a fresh local database and never overwrites an existing one.
- Daily backup schedule: 02:00, seven retained copies. Manual backups before and
  after seed succeeded. Scheduled execution has not yet occurred.
- Root Dockerfile built and served health against the restored database on Node
  22. Local credential files were absent from the image.
- API persistent directory `/app/storage` configured in Vibehost. Deployment v3
  created marker `d54b9c2f-2063-46be-ae31-2da378234f65`, creation time
  `2026-10-07T12:25:37.785Z`. GitHub deployment v4 logged `preserved` with
  exactly these same values at `2026-10-07T12:31:36.961Z` and passed health.
- API deployment v4 used `builder=dockerfile` from repository root on `develop`,
  commit `a3380699`. Existing managed database was reused.
- UI standalone Dockerfile passed a clean build with `npm ci`; runtime health
  proxy and static page passed locally. UI source configured as `apps/web` on
  `develop`, using the same repository. No database is attached to the UI.

## GitHub auto-deploy acceptance

- API v5 automatically deployed commit `e1a8e55e` after a push to `develop`,
  using the root Dockerfile. Health gate and public route both passed HTTP 200.
- UI v3 automatically deployed commit `1184aa15`, with subdirectory `apps/web`
  and its standalone Dockerfile. Health gate and public route passed HTTP 200.
- Both auto-deploy switches remain enabled. No Redeploy button was pressed for
  these webhook-triggered versions. A later API version is also processing the
  `1184aa15` release-identification change; that only adds a startup log.
- `ERP_SEED_ON_START=false` and `ERP_STORAGE_PROBE=false` are saved for future
  deployments. `/app/storage` remains mounted; the marker is retained as evidence.
- UI `API_BASE_URL` explicitly points to the deployed API for future deployments.

Phase 4 acceptance passed. Phase 5 starts with 0006 Project
Execution + Cost; production remains gated by the roadmap's financial, RBAC,
storage, restore and UAT requirements.
