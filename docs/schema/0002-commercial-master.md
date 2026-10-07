# 0002 Commercial Master

Implemented in `packages/db/prisma/schema.prisma`.

## Models
- Partner
- PartnerContact
- PartnerBankAccount
- Service
- PartnerService
- ServiceRelationship
- Contract
- ContractParty
- ContractItem
- ContractService
- ContractTerm

## Database-only constraints
`packages/db/prisma/0002_commercial_constraints.sql` contains PostgreSQL CHECK constraints that Prisma schema cannot fully express.

When Prisma tooling is available:
1. Generate the structural migration with `prisma migrate dev --name commercial_master`.
2. Append/reconcile the SQL constraints from `0002_commercial_constraints.sql` into the generated `migration.sql`.
3. Run `prisma validate`, `prisma generate`, and migrate a clean PostgreSQL 16 database.

## Important invariants
- Contract/service effective dates must be ordered.
- Share/tax/discount rates use decimal fractions (`0.40` = 40%).
- Service cannot depend on itself.
- Contract cannot be its own parent.
- Signed/active contract mutability is enforced in the service layer, not by direct status PATCH.
