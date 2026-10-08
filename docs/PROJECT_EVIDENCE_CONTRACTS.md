# Project evidence and contract preparation — v0.6.10

This release prepares project files and a primary fixed-value project contract.
It does not record signing, activate contracts, accept milestones, verify billing
triggers or post financial entries. Those commands must enforce the 0004 rules
before formal acceptance is opened.

## GST owner workflow

1. Open a project and use Hồ sơ dự án to upload a PDF (maximum 5 MB). Choose
   Hợp đồng, Hồ sơ nghiệm thu or Hồ sơ khác and optionally enter a document number.
2. Create the primary contract draft, entering its name, number and exact value
   before tax. Currency comes from the project. The server binds its partner,
   owner and company to the project and generates the contract code.
3. Choose Gắn hồ sơ on the draft, select the uploaded contract PDF and give a reason.
4. Gửi duyệt hợp đồng moves DRAFT to UNDER_REVIEW. The reviewer can Duyệt nội bộ
   (APPROVED) or Trả lại hợp đồng (DRAFT), giving a reason.
5. Download PDFs from the project list. Approval is internal and does not mean
   that a legal signature or contract activation has occurred.

## Storage and access

- Existing PROJECT_EDIT permits upload; PROJECT_VIEW permits project file reads.
  Owner/company scope is checked for both. Contract files additionally need
  CONTRACT_EDIT + CONTRACT_VIEW to upload and CONTRACT_VIEW to read. Milestone
  evidence similarly needs MILESTONE_EDIT + MILESTONE_VIEW to upload and
  MILESTONE_VIEW to read. No new permission grants are seeded by this patch.
- Private files are stored under STORAGE_ROOT/documents/company-UUID/attachment-UUID.pdf.
  Production requires an absolute STORAGE_ROOT and local storage; staging uses
  its existing persistent /app/storage. Never expose that directory as static files.
- Upload is bounded JSON/base64, with canonical encoding, PDF header/end-marker
  and filename checks. These checks do not parse the complete PDF or scan malware.
  Downloads use attachment disposition; no public file URL or inline PDF viewer.
- File size and SHA256 are recorded. Download, contract submission and approval
  check active project-scoped Document, attachment tenancy, exact server path,
  regular file, size and digest. Missing/changed files block the action.
- Metadata, sequence and audit commit together. A failed metadata transaction
  removes its newly created file. Files have server-generated names; client paths
  are never accepted. Records/files have no delete endpoint in this release.
- The UI proxy allows up to 7 MB JSON only on the upload route (a 5 MB PDF becomes
  about 6.67 MB base64); other commands retain 32 KB. It forwards PDF content type
  and download disposition, with cookies, no-store and no redirects.

## Contract enforcement

- Existing CONTRACT_CREATE/EDIT/SUBMIT/APPROVE commands also enforce project scope.
  Edit/review commands require CONTRACT_VIEW. Codes, company and actor are server-owned.
- One primary MAIN contract is created per project; the project row lock prevents
  concurrent duplicates. No arbitrary status or company patch is accepted.
- Only DRAFT accepts a replacement PDF. Submit/approve requires a readable
  same-project CONTRACT document. UNDER_REVIEW accepts approval or return only;
  APPROVED is not editable through these commands. Stale updatedAt returns 409.
- Exact Decimal money remains a string. Partner tenancy/status and project
  currency are checked. The value is before tax; this patch does not infer taxes,
  billing schedules, contract effectiveness or accounting entries.
- Every successful transition carries actor, reason and old/new values in AuditLog
  in the same transaction. No endpoint changes a contract to SIGNED or ACTIVE.

## Verification — 2026-10-08

66 evidence/contract checks, 81 execution checks and 52 auth checks passed using
disposable local databases (199 total). Workspace and Node 22 Docker API builds passed.
Checks cover tenant/owner scope, permissions, CSRF, invalid/oversized PDF, failed
storage, digest/path tampering, stale transitions, concurrent primary contracts,
real HTTP proxy upload/download and rollback cleanup when a project closes mid-upload.

Local browser validation uploaded a generated disposable PDF, created CT-0001,
attached DOC-0001, submitted and approved internally. PDF download matched the
original SHA256; totals/status/files were retained after page reload and API restart.
No fixture files or contracts were inserted into live GST staging.

Staging API provider v18 and UI provider v12 built source `01f8eb8c` and passed
their public HTTP 200 health gates. API and UI health report database connected;
anonymous requests to the new upload route return 401. The public UI serves
v0.6.10 with GST as the default company. A managed PostgreSQL backup completed
successfully (220 KB), labelled “v0.6.10 — hồ sơ PDF và hợp đồng nháp, giữ nguyên
dữ liệu GST”. There is no new schema migration, permission grant or DB instance.
Persistent storage configuration is reused; live GST PDF upload/approval UAT
remains with the owner.

## Next roadmap gate

Implement billing-plan reconciliation, mandatory activation conditions, recording
signed evidence and dates, contract activation and project execution stage change.
Then implement milestone acceptance with active primary contract, accessible
same-project evidence, atomic audit and no automatic revenue/billing verification.
GST owner business UAT, user/role administration and pagination/search remain pending.
