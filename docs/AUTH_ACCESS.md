# Authentication and company access — v0.6.7

## Implemented

- Login, current-user lookup and logout; no public signup.
- Salted scrypt passwords (N=131072, r=8, p=1, 64-byte output), with at most two
  concurrent derivations in the 512 MB staging API container.
- Random 256-bit session IDs in HttpOnly cookies; only SHA256 hashes in PostgreSQL.
  Absolute lifetime: 8 hours. Production cookies are Secure / SameSite=Lax / host-only.
- Sessions survive API restart. Every request checks active user/company and active
  same-company roles; inactive or accidentally assigned cross-company roles grant no access.
- `/auth/me` returns identity, current permissions and a session-bound CSRF token.
  Login/setup require the configured UI Origin. Logout also requires X-CSRF-Token.
- Project reads require PROJECT_VIEW. PROJECT_VIEW_ALL permits all projects within
  the authenticated company; otherwise only owned projects appear. Client company IDs
  never determine scope. Results are limited to 100 projects.
- Successful login, logout and initial provisioning create AuditLog records.
- Attempts are limited per IP/company/email: 10 per 5 minutes. Multiple API replicas
  require a shared limiter; current staging runs a single instance.
- Web forwards required headers/cookies to one fixed API, bounds request bodies and
  disables caching. CSP prevents embedding the login page; open its public URL directly.

References: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[official Fastify rate-limit compatibility](https://github.com/fastify/fastify-rate-limit).

## Endpoints

| Method | Path | Access |
|---|---|---|
| POST | /api/v1/auth/login | UI Origin + valid credentials |
| GET | /api/v1/auth/me | Valid session |
| POST | /api/v1/auth/logout | Session + Origin + X-CSRF-Token |
| POST | /api/v1/auth/bootstrap | Explicitly enabled + private token + no company users |
| GET | /api/v1/projects | Session + PROJECT_VIEW + company/owner scope |

## First administrator — owner action required

Deployment creates no live user or default password. The owner enters their own
setup token and password; neither belongs in Git.

1. API `erp-core-web-staging` → Configuration → Environment variables:
   - APP_URL = `https://erp-core-staging-ui.n1.tinhgon.xyz`
   - DEFAULT_COMPANY_CODE = `GST`
   - AUTH_BOOTSTRAP_ENABLED = `true`
   - AUTH_BOOTSTRAP_TOKEN = a private random 64-character token
   - SESSION_SECRET = retain the existing strong value (at least 32 characters).
2. Save and redeploy the API. Open `https://erp-core-staging-ui.n1.tinhgon.xyz/#setup`.
3. Enter GST, your name/email, password (15–128 characters), confirmation and
   setup token. Create the administrator, then log in.
4. Set AUTH_BOOTSTRAP_ENABLED=false, restore AUTH_BOOTSTRAP_TOKEN=disabled and redeploy.
   Further provisioning is rejected as soon as the company has a user.

Generate a token privately in Windows PowerShell if needed:

```powershell
$setupBytes = New-Object byte[] 32
$setupRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$setupRng.GetBytes($setupBytes)
$setupRng.Dispose()
[BitConverter]::ToString($setupBytes).Replace('-', '').ToLowerInvariant()
```

Provisioning uses a PostgreSQL advisory lock to prevent two concurrent initial
admins. It only operates on DEFAULT_COMPANY_CODE with an existing active ADMIN role.
The bootstrap endpoint is disabled unless both the enabled flag and a token of
at least 32 characters are configured.
During ordinary deployment keep AUTH_BOOTSTRAP_ENABLED=false and
AUTH_BOOTSTRAP_TOKEN=disabled. The short sentinel cannot authorize provisioning;
it satisfies VibeHost's scanner, which otherwise blocks on an optional token.

## Verification

Migration `20261007160000_auth_sessions` is additive and transactional. Existing
0006 records and seeded permission/sequence counts are unchanged.
Restore the baseline into an isolated DB named `erp_auth_acceptance*`, point
DATABASE_URL to it, and run:

```powershell
pnpm db:migrate:deploy
pnpm db:generate
pnpm build
pnpm --filter @erp/api test:auth
```

52 integration checks pass: credentials, generic failures, cookie properties,
CSRF/Origin, company/owner isolation, cross-company role rejection, disablement,
session persistence/rotation/expiry/revocation and concurrent provisioning.
Fixtures are deleted; the runner refuses a non-acceptance DB.
The earlier 44-check version passed in Node 22 Docker with a 512 MB limit.
Local browser login → projects → reload → logout passed through the actual proxy.
Root API Docker build and standalone ZIP bundle build passed.

## Staging verification — 2026-10-07

- API deployment v10 is live from source `6a19ff23`; runtime reports release
  `0.6.7`, three migrations and no pending migrations. The existing managed
  database `erp_core_web_staging_db` is reused.
- UI deployment v6 is live from source `22b9993c`. The public UI displays the v0.6.7 login screen and
  “Dịch vụ đang hoạt động”. The proxy health request returned 200 and the
  unauthenticated `/auth/me` request returned 401 in API runtime logs.
- A nonexistent staging fixture login through the UI returns the generic invalid
  credentials message; no account or session was created. Actual owner login
  remains pending until human provisioning.
- APP_URL is the UI origin. AUTH_BOOTSTRAP_ENABLED=false and
  AUTH_BOOTSTRAP_TOKEN=disabled keep provisioning closed during normal deployment.
- A successful 214 KB backup was taken before the auth rollout. The prior 0006
  backup restore and this release's isolated auth tests cover migration integrity;
  a post-auth staging backup restore has not yet been performed.
- Screenshot: `artifacts/auth/staging-v067-login.png` (local, ignored).

## GST company identity — 2026-10-07

The owner requested company code `GST` and legal name
`CÔNG TY CỔ PHẦN CÔNG NGHỆ GST VIỆT NAM`.
Migration `20261007173000_gst_company_identity` renames DEFAULT in place, preserving
its UUID and all user/role/business relations. It fails rather than merging tenants
if DEFAULT and GST both exist. An empty database is populated as GST by the seed.
Seed rejects a stale DEFAULT setting to prevent recreating the former company.
API fallback, example/local configuration and the web form now use GST.

A pre-change staging backup (217 KB) restored successfully with three migrations,
92 permissions, 16 sequences and one existing user. Applying the rename to that
restore kept the same company UUID, one company, one ADMIN role, 92 role permissions
and 16 sequences. Two consecutive seeds did not recreate DEFAULT. API/web builds
and all 52 auth checks passed with the new migration in the isolated acceptance DB.

Existing accounts must log in with company code GST and their existing credentials.
Provisioning is closed when a company already has a user; do not recreate that user.
For older DEFAULT backups, pass `-ExpectedCompany DEFAULT` to the restore verifier;
for the renamed database use `-ExpectedCompany GST -MinimumMigrations 4`.

Rollout status: the GST change is tested and committed locally, but GitHub rejected
both Git push and Git Data API writes with HTTP 500 on 2026-10-07. It has not been
deployed to staging. Staging DEFAULT_COMPANY_CODE was restored to DEFAULT until
the new migration can be deployed. The pre-change backup contains the owner's
existing ADMIN account; do not try to bootstrap another account.
After publishing the change, set staging DEFAULT_COMPANY_CODE=GST, deploy the API
(which applies the rename), then deploy the UI and verify a new backup restore.

## Remaining before business UAT

- Human provisioning and actual staging login.
- User/role administration and password reset workflows.
- Project milestone/budget/cost commands with permissions, audit attribution,
  transaction rules and write screens; every mutation needs Origin/CSRF checks.
- Verify actual staging login/project access after the owner provisions an admin.

This release supplies authenticated access and a project read screen; the 0006
execution/cost workflow still needs its commands, screens and UAT.
