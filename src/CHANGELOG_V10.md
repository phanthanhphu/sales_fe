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
