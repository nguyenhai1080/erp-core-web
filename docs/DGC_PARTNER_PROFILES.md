# v0.6.11 — Partner profiles based on the current DGC application

Reference inspected read-only on 2026-10-08: https://script.google.com/macros/s/AKfycbydoqLjQT7f4tP3Y-6fiieQpNOOuk1GMXP45SNQo0uVKDE9KovuBJ5PeG1wJ32L03G4/exec

Opened Quản lý Đối tác → Thêm mới đối tác and inspected the complete form and select options. No DGC records were created or changed, and no data was imported.

| DGC field | ERP field / behavior |
| --- | --- |
| Mã đối tác | partnerCode; optional manual code on create, otherwise transactionally generated; immutable after creation |
| Loại đối tác | Input → SUPPLIER, Output → CUSTOMER, Both → BOTH, Other → OTHER; the current DGC list confirms input suppliers / output customers |
| Tên đối tác * | legalName, required |
| Nhóm đối tác | partnerCategory; Telco, Content Provider, Aggregator, Vendor, Customer, Outsourcing, Other |
| Quốc gia | countryName; free text matching DGC; preserve existing ISO countryCode independently |
| Payment term days | paymentTermDays; new form defaults to 45 as observed in DGC; integer 0–3650 or empty |
| Business Registration No. | registrationNumber |
| Tax Registration | taxCode |
| Attn / Người nhận invoice | invoiceRecipient |
| Email invoice | invoiceEmail |
| Email liên hệ | email |
| Điện thoại | phone |
| Địa chỉ | registeredAddress, multiline |
| Địa chỉ xuất Invoice/SOA | billingAddress, multiline, distinct from registered address |

Country and category start unselected to avoid copying Mozambique/Telco onto unrelated GST partners. Other fields are optional; email values are validated. Existing partner records remain unchanged by the migration. Existing countryCode remains visible when countryName is empty. Contacts, bank accounts and contract relationships remain intact.

## Usage

Open **Đối tác** → **Thêm mới đối tác**. **Xem hồ sơ** opens the full record; PARTNER_EDIT users can update details with a reason. Users with only PARTNER_VIEW see a disabled read-only form. The same creation form is available inside **Dự án** and refreshes the project partner selector after saving.

Search by code, name, tax registration or contact email. The dedicated list has server pagination of 50 records. The existing project picker remains compatible with GET /partners, capped at 100 records; a searchable project picker is a separate future improvement.

## Integrity and deployment

Five nullable columns are added by `20261008090000_dgc_partner_profiles`; no destructive migration or seed rewrite. API uses server company/actor, PARTNER_VIEW/CREATE/EDIT, origin and session CSRF checks, unique company/code, transaction audit, row locking and expectedUpdatedAt conflict detection. An already occupied auto-code is skipped. Blank optional fields can be explicitly cleared on edit.

Local commands (PowerShell, repository root; local database URL only):

```powershell
pnpm db:migrate:deploy
pnpm db:generate
pnpm build
pnpm --filter @erp/api dev
```

In another PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health | ConvertTo-Json
pnpm --filter @erp/web dev
```

Integration suites require disposable databases, never a staging DATABASE_URL. 74 partner checks, 81 execution checks, 66 evidence checks and 52 auth checks passed (273 total). Browser creation and editing were verified with explicitly fake EXEC_PREVIEW records, including distinct invoice address and contact/invoice emails.

Before staging source push: successful PostgreSQL backup 222 KB, note “Trước v0.6.11 — bổ sung hồ sơ đối tác theo DGC, bảo toàn dữ liệu GST”. Root Dockerfile runs migrate deploy before API start; deploy API before the UI that uses the new fields. Staging verification is recorded after rollout.
