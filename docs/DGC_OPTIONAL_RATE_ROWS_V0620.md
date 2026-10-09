# DGC optional-rate reconciliation rows — v0.6.20

Donor: deployed DGC v61, `21_Recon_OCR.js`, `DGC_parseReconGroupedServiceRowsFromText_`, `DGC_buildReconDetailFromRowNumbers_` and `DGC_parseReconFlexibleDetailRowsFromLines_`. Read-only donor source was inspected; it was not executed. This extends v0.6.19 financial review, not Invoice issue/payment scope.

Numbered service rows now accept the donor's seven original monetary columns when both percentage columns are absent. Nine-column rows also accept the two percentages when OCR loses their percent signs. Rates remain bounded to 0–100%. Missing rates are explicitly shown as unread, with a warning; original amounts are retained and no contractual percentage is inferred. No new financial formula is introduced.

Rows are restricted to the section before the MZN/USD summary/footer. A recognized numbered row that cannot be fully read blocks finalization instead of being silently replaced by the aggregate summary. Existing MZN child/total, USD conversion, payable and amount-word checks still apply. This deliberately does not reproduce donor fallbacks that ignore trailing numeric noise or reconstruct uncertain values. Unnumbered and column-major grouped layouts remain outside this patch; full DGC PDF coverage is not claimed.

Verification: 57 synthetic donor characterization checks (16 new), including missing rates, missing percent signs, retained amounts, incomplete columns, wrong totals, out-of-range percentages, and footer rows falsely presented as children. The 104 finalization/Invoice integration checks pass on a fresh disposable PostgreSQL database. API/Web builds pass. Existing GST records/assets and live financial data were not modified by these tests.
