# DGC interface alignment — UI v0.6.13

The owner requested the current ERP Core interface to follow ERP DGC rather than the oversized initial shell. Reference: the supplied DGC service screenshot and deployed-v61/Index.html CSS (source hashes in DGC_SOURCE_INVENTORY.json).

Uses DGC's #1f4e79 sidebar/primary actions, #f3f6fa background, Arial typeface, 220px desktop sidebar, compact heading/control/table scales, pale table headers, bordered rounded tables and matching two-column dialogs. Service search, create, refresh and status filter now share a compact toolbar. The immutable service identity is displayed once; an independently edited code appears below it only when different. Business status labels remain readable alongside their colors.

Sidebar and page titles follow DGC management labels, retaining the ERP Core/GST identity and the implemented permission-gated modules. Projects remains the added domain. Mobile navigation stays available, tables scroll within their own container, and dialogs become a single column. Keyboard focus indicators, native dialog behavior, form labels and current navigation semantics remain available.

Validation: frontend TypeScript/Vite build; local browser inspection of Service list and popup, Partner list, and 390px mobile navigation/dialog. The mobile page width does not overflow the viewport. No API business commands, permission grants, migrations or data import changes in this release. API release remains v0.6.12; UI release is v0.6.13.
