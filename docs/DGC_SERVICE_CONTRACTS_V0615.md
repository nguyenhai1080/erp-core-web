# DGC service contracts — v0.6.15

Authority: deployed DGC v61, `10_MasterData.js` createContract (164), DGC_syncContractServices_ (220), getContractServiceIds (280), updateContract (376), deleteContract (520); `Index.html` edit/create contract forms (1517/1611), saveContract/saveContractUpdate; `02_Setup_Config.js` CTR/CSV sequences. Source hashes are in DGC_SOURCE_INVENTORY.json. Donor source is read-only and never executed.

## Inherited runtime

Contract_ID is immutable contractCode (automatic CTR0001 or explicit manual API code); Contract_No is editable contractNumber. Input/Output/Other is dgcDirection, independent from project MAIN/ADDENDUM. Existing project contracts remain excluded and cannot be edited by these endpoints. DGC service contracts use existing shared Contract/ContractService tables and foreign links, with internal structural classification OTHER and business/value classification REVENUE_SHARE.

Fields: name, partner, selected services, signing/start/end dates, currency, revenueShareRate, fixedFee, paymentTermDays, billingCycle, taxRate, ownerEmail, notes, attachmentUrl, server actor emails and timestamps. Create defaults Output/Draft/MZN/Monthly; zero rates/fee/backend payment days; form payment days 30. Statuses Draft/Active/Expired/Terminated/Suspended are editable with existing CONTRACT_CREATE/EDIT permissions. Owner defaults to current actor email. CONTRACT_VIEW covers the reference choices from the same company, matching donor Staff/Manager/BOD reference access; no new grants are added.

Selected services are deduplicated, share rate and fee synchronized. Draft links become Active; removed links become Inactive, retain UUID and remain in history. Reselection reuses the link. dgcStatus preserves Active/Expired/Terminated/Suspended independently from technical RecordStatus; Expired/Terminated map technical INACTIVE. Optional source dates stay null rather than inventing dates. ContractService.effectiveFrom is now nullable; all existing dates are preserved. No stored contracts are converted to DGC direction by migration.

Delete requires existing CONTRACT_EDIT and CONTRACT_TERMINATE permissions, separate confirmation, reason and expected version. All actual Contract relations block deletion (including inactive service links, parties/items/terms, project links, billing/payment schedules, reconciliations/revenues/invoice scopes, commercial snapshots, adjustments, parent children and source/official-document links). This retains donor's strict service-link deletion guard. Future AR/AP/payment paths must extend the guard; those business modules are not implemented by this release.

## Explicit adaptations and limits

Decimal strings preserve share/tax up to six places and fees up to four. The donor revenue formula multiplies net by share rate and gross by tax rate (`30_Revenue.js` lines 18–27), so 0.15 means 15%, not 15. Target validates rates in [0,1], nonnegative fees, real calendar dates/date order, company references, URL schemes, days 0–3650 and text lengths; donor is more permissive. No new revenue calculation or billing command is performed when editing contracts.

Optimistic concurrency, row locking, transaction-wide link synchronization/audit, company isolation, Origin/CSRF and unique codes are required. Project workflow classifications/approvals are unchanged. New service contracts cannot substitute for project MAIN activation. Internal link identity uses the existing stable UUID, not donor CSV display numbering; any subsequent donor import must preserve original CSV identity explicitly rather than overwrite links. Automatic CTR allocation uses a separate DGC_CONTRACT sequence with collision checks to preserve the existing project sequence.

Reference forms support up to 1000 partners/services and fail explicitly above that limit rather than silently omit choices. Existing contracts are not imported, role provisioning parity is pending, and financial reconciliation/revenue/invoice/payment execution remains subsequent roadmap work. Known donor getContractServiceIds fallback can resurrect header service selection when all links are Inactive; target uses retained link status directly and does not resurrect removed selection.

## Verification

Workspace build and additive migration passed on disposable local databases. 100 contract checks cover source defaults/rates, multiple services and duplicates, zero edits, every DGC status, preserved link identity/removal/reselection, cross-company references, immutable Contract_ID, project contract exclusion, concurrency/stale edits, guards/audits, permissions and CSRF. Existing 140 Partner, 89 Service, 81 execution, 66 evidence/proxy and 52 auth checks passed (528 total). Evidence test runs from apps/api as required by its fixture paths.

Browser local: create and reopen a fake contract, verify CTR numbering, dates, fee/rate and selected service. Staging rollout follows a database backup; no fake business records are created on staging and no financial data are imported.
