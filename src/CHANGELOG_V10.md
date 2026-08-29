## BOM-local Product Colors

- Removed Product Color Master from the active FE menu/routes and backend master-data API.
- Product / Style Color identity, Child Colors and product image now belong to one BOM only.
- BOM material color values link to the Child Color IDs inside that same BOM.
- MPR Create/Update/Edit resolves Product Colors and Child Colors from the source BOM, never from shared Product Color Master data.
- Existing BOMs with legacy Product Color Master links are migrated one way into BOM-local data without incrementing the BOM MPR-source revision.
- Product Color image upload uses the BOM attachment scope `COLOR`; an image-only replacement does not mark an MPR source stale.

## Order No auto-increment

- New Orders no longer require manual Order No input.
- Backend generates buyer-scoped Order No values atomically as `ORD000001`, `ORD000002`, ... using MongoDB sequence allocation.
- Existing Orders keep their current Order No and can still be edited.
- The Add Order dialog now shows that Order No is auto-generated.

- Original-format BOM downloads now force the worksheet name to exactly `BOM Details`, removing source-specific suffixes such as `_solid_F26`.
# V10 - Master Data Upload Clarity

- Moved **Vender Code** before **Ship To** in the shared master-data menu.
- Changed generic action labels to module-specific labels:
  - Upload New Vender Code / Upload New Ship To
  - Download Vender Code Edit Excel / Download Ship To Edit Excel
  - Upload Edited Vender Code / Upload Edited Ship To
- Changed upload dialog titles to:
  - Vender Code — Upload New Excel
  - Ship To — Upload New Excel
- Added a visible `Current module` line inside the upload dialog.
- Kept endpoint mapping unchanged:
  - Vender Code -> /api/master-data/vendor-codes
  - Ship To -> /api/master-data/ship-tos

## BOM Line Image Cell Mapping

- Shows the `Image` column by default in Core BOM and every Packing material table.
- Keeps `Image` visible across the BOM table view presets.
- Uses each row's `BomLine.primaryImage` as the single source of truth.
- Rebuilds exported line images into the dedicated Image cell (column C in the approved format), including images imported from Excel.
- Synchronizes BOM line source rows when Excel rows are inserted so images do not drift to neighboring material rows.
- Removes the old image occupying a material row before re-embedding it, preventing duplicate/overlapping line pictures.

## BOM sheet and filename normalization
- BOM export/template worksheet name is standardized as `BOM Details`.
- BOM download filenames now include time down to seconds using `yyyyMMdd_HHmmss` to avoid duplicate names for repeated exports.

## BOM -> MPR source change tracking

- BOMs remain editable after they have been used by an MPR; deleting a referenced BOM is still blocked.
- Added a BOM MPR-source revision and change metadata for header, Product Color, Packing and material-line changes.
- Every saved MPR generation batch stores the BOM source revision used to create it.
- IN_PROGRESS MPRs show which source BOM changed and provide `Update from BOM` / `Update all changed BOMs` actions.
- Refresh reuses the saved Product Color, Packing, Ship To and PO Qty selection, rebuilds BOM-owned fields, and preserves MPR-owned Sales/stock/vendor inputs when the source row can still be matched.
- Confirm MPR is blocked while any source BOM is stale.
- COMPLETED MPR is frozen/read-only by default: no edit, delete, import or BOM refresh while completed. Users with REOPEN_COMPLETED_MPR may reopen it to IN_PROGRESS with a required reason saved in reopen history.
- If a BOM changed while the MPR was completed, the change is informational until the MPR is explicitly reopened; after reopening, Update from BOM is available.
