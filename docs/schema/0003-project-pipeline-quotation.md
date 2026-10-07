# 0003 - Project Pipeline, Quotation and Approval Engine

Adds the commercial opportunity layer after Commercial Master:

- `projects`
- `project_qualifications`
- `project_activities`
- `quotations`
- `quotation_items`
- `approval_workflows`
- `approval_steps`
- `approval_requests`
- `approval_actions`

## Core invariants

- One current qualification revision per project.
- One current quotation revision per logical quotation group.
- ERP v1 permits one active/current quotation chain per project.
- Maximum one accepted quotation per project.
- Sent quotations are treated as immutable commercial snapshots; commercial changes require a new revision.
- Project `WON` is set through the quotation acceptance command, not by direct status patching.
- Monetary quotation totals exclude optional items when `isSelected = false` in application logic.

PostgreSQL constraints that Prisma cannot express natively are in `packages/db/prisma/0003_project_pipeline_constraints.sql`.
