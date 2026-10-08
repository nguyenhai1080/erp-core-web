# Service master — v0.6.12

Source: exact deployed DGC Apps Script version 61, recorded in DGC_SOURCE_INVENTORY.json. This ports its Service master into the existing ERP Core repository. It does not implement the downstream service finance chain or import live DGC rows.

## Field and behavior mapping

| DGC v61 | ERP Core |
| --- | --- |
| Service_ID (immutable) | serviceKey; UUID id remains the technical primary key |
| Service_Code (editable) | serviceCode; blank create uses the generated identity; blank update falls back to serviceKey |
| Service_Name | serviceName, required and trimmed |
| Basic/Application/Content/Utility/Other | dgcCategory with the same five values; UI defaults Basic, API defaults Other as in DGC |
| Keyword/Description | keyword/description, empty values stored as null |
| Active/Inactive/Suspended | ACTIVE/INACTIVE/SUSPENDED; UI and API default ACTIVE |
| Start_Date/End_Date | nullable calendar dates; end date is available on create as well as edit |
| Created_By/Updated_By and timestamps | server session email and timestamps; audit retains actor user ID and company |

Sources: 10_MasterData.js createService, updateService, deleteService; Index.html FORM_BUILDERS.service, FORM_EDITORS.service and service list columns; 00_Core_Config.js categories/statuses; 04_DataAccess_Utils.js DGC_getNextId_; 02_Setup_Config.js SERVICE sequence prefix SVC. Automatic identities use SVC0001 (no hyphen), advance the existing company sequence and skip occupied identities/codes. Code uniqueness and identity uniqueness are separate, company scoped, as DGC's separate guards are workbook scoped. Updating a code does not change UUID links or serviceKey.

Unused services can be deleted with an explicit confirmation and audit reason. Services linked through partner services, contract items/services, quotations, service relationships, reconciliation items, commercial snapshots or revenue are blocked; users can select Inactive/Suspended instead. The inherited DGC guard names contract, contract-service, revenue and reconciliation; the target guards all nine actual service relations, including project extensions. A row lock and foreign keys protect against a concurrently created reference.

## Explicit adaptations and unresolved donor behavior

- Preserve existing category values (VAS, SOFTWARE, etc.) without guessing a DGC equivalent. The new dgcCategory is independent; old rows are labelled "Chưa đối chiếu" until explicitly edited. New inherited services use legacy category OTHER. Future service contracts must use dgcCategory, not infer DGC meaning from category.
- Existing rows retain all codes and UUID links. Migration backfills immutable serviceKey from serviceCode; it adds nullable profile fields and SUSPENDED, without replacing data. Direct legacy Prisma inserts retain a generated UUID identity unless their caller supplies serviceKey; this is a technical compatibility fallback, not the user-facing DGC numbering path.
- DGC roles Staff/Manager/BOD map at the command level to SERVICE_VIEW/CREATE/EDIT and management deletion to SERVICE_ARCHIVE (the existing permission name). No role grants are changed. ADMIN already holds these permissions. Full donor role provisioning/admin parity remains pending; do not claim it from this release.
- DGC updateService does not enforce unique codes; target enforces uniqueness on update as well, avoiding ambiguous downstream matching. Duplicate attempts return 409.
- DGC accepts arbitrary status strings and unvalidated dates at its backend. Target restricts the three business statuses and validates real YYYY-MM-DD dates. Existing ARCHIVED records remain visible/read-only. DGC has no date-order guard; reversed valid periods are currently preserved. This release does not invent a new date-order rule.
- Update/delete require the viewed updatedAt plus a reason; stale/concurrent changes return 409 and successful actions audit old/new values. Existing tenant boundaries, authenticated permissions, Origin and CSRF protection remain active.
- Text limits are explicit (code 100, name/keyword 500, description 4000), unlike the donor's unbounded Sheet cells. No live data import has been attempted; validate lengths against the reference export before a migration.

## Validation

- Workspace build and additive migration passed locally.
- 89 service checks: exact defaults/categories/statuses/numbering, separate identity and editable code, duplication, nullable clearing, real dates, preserved reversed periods, company/permission/CSRF boundaries, stale/concurrent writes, partner and parent/child dependency guards, deletion audit and paginated search.
- Existing regression suites: partners 74, execution 81, evidence 66, authentication 52 (273 checks), all passed on disposable local databases.
- Local browser: create full profile, reload fields, edit code/status and verify unchanged Service_ID; no staging business fixtures created.

The existing database and financial command paths remain the same. Build/health and these tests validate this master module's implementation, not full DGC finance parity or actual DGC data migration.
