# Dashboard v0.6.24

Donor: deployed DGC v61 `Index.html` Dashboard cards, monthly chart,
`renderDashboardRevenueChart`, and `60_Reports_Dashboard.js` KPI aggregation.

- The cumulative USD card uses Company Share, mapped to finalized Payable USD
  in the inherited reconciliation workflow; only TOTAL/include=true contributes.
- AR uses current issued Invoice outstanding balances and existing AR_VIEW access.
- The chart shows twelve months, year/service filters, Invoice Revenue USD,
  Payable USD, WHT USD, and Company Share (same as Payable in this workflow).
- All services excludes CHILD. A specific child service displays its own detail.
- The four-card layout follows DGC. AP and cash display unavailable until their
  ledger modules exist; this release does not invent balances or import DGC data.

Explicit source differences: the donor chart excludes only Cancelled rows and
falls back from a zero Invoice Revenue to other monetary columns. Core reports
only current approved reconciliation revenue (consistent with the donor KPI)
and preserves actual zero amounts instead of substituting a different metric.
The source's floating-point sums are replaced by Decimal sums on the server.

Validation: API/web production builds and ten MEUBEAT-based characterization
checks, covering parent exclusion, child visibility, multiple periods and zero data.
