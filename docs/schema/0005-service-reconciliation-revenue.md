# 0005 - Service Reconciliation, Revenue and Invoice Scope

This pack adds the service-business financial source chain:

`ContractService -> Reconciliation -> Revenue -> InvoiceScope`

## Models

- `Reconciliation`
- `ReconciliationItem`
- `CommercialTermSnapshot`
- `Revenue`
- `InvoiceScope`
- `InvoiceScopeItem`

## Integrity rules

- Revision-based entities use `logicalGroupId`, `revisionNo`, `isCurrent`, and `supersedesId`.
- One current reconciliation item is allowed for a business scope and period.
- One current revenue is allowed for a business scope and period.
- One current invoice scope can own a revenue at a time.
- Commercial terms are snapshotted when reconciliation is approved so later contract changes do not rewrite historical revenue.
- Raw OCR output, corrected OCR output, and approved reconciliation snapshots are stored separately.
- PostgreSQL partial unique indexes and CHECK constraints are in `0005_service_reconciliation_constraints.sql`.

## Runtime services expected

- `ReconciliationValidationService`
- `CommercialTermResolver`
- `RevenueCalculator`
- `InvoiceScopeBuilder`
- `FinancialLockService`

Approval/revision must be executed transactionally. Direct mutation of generated revenue values is not permitted by the application design.
