# 0004 Contract Execution + Billing

Implements the execution layer between accepted quotation/project and finance-ready billing.

## Models

- `ProjectContract`
- `ContractActivationCondition`
- `ContractBillingSchedule`
- `ContractPaymentSchedule`
- `ContractAdjustmentImpact`

## Core invariants

- A project can have multiple contracts, but at most one primary `MAIN` contract.
- Contract activation is a command/workflow action, not a direct status patch.
- Mandatory activation conditions must be `SATISFIED` or explicitly `WAIVED` before activation.
- Billing schedules carry trigger state separately from billing/invoice state.
- Fixed project contracts must be reconciled against the billing plan before activation.
- Addenda change current contract value only after they are legally effective; they do not silently mutate existing billing schedules.
- Retention is represented as a billing schedule with `billingType=RETENTION`.
- Recurring billing is supported with a bounded recurrence window.
- `remainingBillable` and `invoicedAmount` are materialized financial values and must only be updated by backend transactional services.

## Lineage

`QuotationItem -> ContractItem -> ContractBillingSchedule -> InvoiceItem` (invoice linkage arrives in 0007).

## Commands to implement

- `POST /projects/:id/create-contract-draft`
- `POST /contracts/:id/mark-signed`
- `POST /contracts/:id/activate`
- `POST /contract-activation-conditions/:id/satisfy`
- `POST /contract-activation-conditions/:id/waive`
- `POST /billing-schedules/:id/mark-trigger-met`
- `POST /billing-schedules/:id/verify-trigger`

## PostgreSQL-only constraints

See `packages/db/prisma/0004_contract_execution_constraints.sql`.
