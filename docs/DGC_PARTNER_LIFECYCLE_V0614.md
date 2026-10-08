# Partner lifecycle inheritance — v0.6.14

Source: deployed DGC version 61, 10_MasterData.js createPartner/updatePartner/deletePartner; Index.html partner forms and savePartner/savePartnerUpdate payloads; 02_Setup_Config.js PARTNER sequence. Hashes are in DGC_SOURCE_INVENTORY.json. This extends the existing Partner implementation and shared project selector.

## Mapping

- Partner_ID → immutable partnerKey; existing UUID primary keys and all foreign links remain intact. Existing partnerKey values are backfilled from partnerCode. Partner_Code is separately editable, with uniqueness per company. Manual create uses its code as the identity unless a distinct partnerKey is supplied.
- Automatic donor prefix is **PRT** (not the initial ERP Core PTR). New identities use PRT0001 without a hyphen. Migration changes only the legacy PTR sequence prefix to PRT, preserving counters, custom prefixes and existing partner codes; the allocator skips occupied identities/codes.
- Partner_Name/Type/Category → legalName/partnerType/partnerCategory. Input maps SUPPLIER, Output CUSTOMER, Both BOTH, Other OTHER. UI defaults Input/Telco, backend defaults Other/Other.
- DGC Active/Inactive/Blacklist → ACTIVE/INACTIVE/BLACKLISTED. Create defaults ACTIVE, including the database default for new records. Existing PROSPECT/SUSPENDED/ARCHIVED values are not rewritten. Legacy current PROSPECT/SUSPENDED can remain; ARCHIVED stays read-only. DGC allows editing Blacklist, including changing it back to Active; target follows that explicit edit path with audit and stale-write protection.
- Contact_Name and Invoice_Attention_Name → contactName and invoiceRecipient, falling back to each other when blank. Contact_Email/Invoice_Email → email/invoiceEmail, likewise falling back to each other. Billing_Address falls back to registeredAddress. To clear either paired email/name completely, clear both; blank billingAddress uses registeredAddress while it exists.
- Tax_Registration_No/Tax_Code share the existing taxCode field for the current single-tax-number form. No live data import is performed. If a donor export contains differing tax alias values, preserve/resolve them explicitly before import.
- Country → countryName (create defaults Mozambique as DGC; UI makes that visible/editable). Payment_Term_Days defaults 0 in the backend, 45 in the create form. Business registration/phone/addresses remain present. Created_By/Updated_By are server session emails, with timestamps and immutable actor IDs in audit logs.

The Partner management list now includes all statuses and supports filtering; it searches identity/code/name/tax/contact/invoice email. Calls without the status filter retain the active/prospect selection contract needed by Projects. Creating a project already rejects inactive/blacklisted partners; changing Partner status does not silently modify historical financial records.

Unused partners can be deleted with a separate confirmation and audit reason using the existing PARTNER_ARCHIVE management permission. Deletion is blocked for all actual target references: contacts, bank accounts, partner services, contracts, contract parties, projects, quotations, reconciliations, revenues and invoice scopes. DGC's donor guard lists contracts/revenue/reconciliation/ARAP/transactions; actual AR/AP/transaction command paths are still pending in ERP Core and must extend this guard when introduced. Do not claim absent financial paths are implemented by this guard.

## Explicit target adaptations

Code/identity uniqueness is enforced for create and update, even where the donor does not enforce it. Calendar-free profile validation restricts known categories/types/statuses, validates email and payment days (0–3650), and sets text lengths. Update/delete require expectedUpdatedAt and a reason, row locking, authenticated company permissions, Origin/CSRF protection and audit. Role provisioning parity remains pending: this release adds no permission grants or real users.

Older clients may omit the editable partnerCode/status in an update; those values are preserved rather than reset. The updated UI submits both explicitly and uses partnerKey when the code field is blank. Direct legacy Prisma inserts retain a generated UUID identity unless the caller supplies partnerKey; the API provides the inherited numbering path. No stored GST profile/status/email/address is rewritten by migration; fallbacks apply only to submitted new/edited profiles.

## Validation

Workspace TypeScript/Vite build passed. 140 Partner checks cover profile validation, server ownership, exact defaults, numbering/collision handling, immutable identity/editable code, optimistic concurrency, audits, fallback directions, clearing both paired fields, all three DGC statuses, active-selection vs all-status management lists, linked-project deletion blocking, absence of a deletion audit on rejection, unused deletion, permissions and company/CSRF isolation. 89 Service, 81 execution, 66 evidence and 52 authentication regression checks also passed (428 total), all on disposable local databases.

Local browser: create a complete fake partner, verify invoice/contact fallback, edit code while preserving Partner_ID, move to Inactive and filter it in the management list. No fake records or financial commands are executed on staging. Backup precedes the additive staging migration. This release does not import DGC records or complete service contracts/financial business parity.
