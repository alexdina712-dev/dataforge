# Five-minute DataForge walkthrough

1. Open https://dataforge-dina19.vercel.app. If the free API is waking, give it a minute and refresh.
2. Choose **Explore sales operations**. Observe 27 rows, seven columns, four missing cells and three duplicate rows.
3. Search **Unit Price** in Overview; inspect its numeric summaries. These are computed from the sample, not static display figures.
4. Open **Preview** to compare the original and working copies. Browse the last two rows using Next rows.
5. Open **Clean**, keep Remove duplicate rows selected, then Preview changes. Review 27 → 24 rows and Apply transformation.
6. Choose Fill numeric values with mean, preview and apply. Original values remain intact.
7. Open **History**. Undo the last step, or reset the dataset to its original.
8. Open **Charts**. Try a bar chart for Region, histogram for Units and scatter plot for Units / Unit Price. View the underlying chart values.
9. Export CSV and Excel. They contain the complete working data, not only the preview rows.
10. Import the Customer directory sample and review possible duplicate Full Name values. Suggestions do not merge automatically.
11. Try the Inventory workbook or upload it from samples to choose Stock or Suppliers.
12. Delete a dataset or Clear workspace to remove all private session data.

The repository includes test fixtures, API/security tests, CI, architecture/security notes and a case study. The implementation was AI-assisted; the code is available for review. Temporary data expires after one hour or service restart.
