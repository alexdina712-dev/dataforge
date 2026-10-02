# Data pipeline

Bound request bytes before multipart parsing. Decode CSV as UTF-8/BOM; sniff or select delimiter; require rectangular rows and unique nonempty headers. Validate XLSX ZIP/XML expansion, entries and coordinates before openpyxl reads the selected worksheet. Formula execution is never supported.

Whitespace-only cells become missing. Other original text remains intact. Leading-zero IDs and literal NA/null stay text. Types: nullable integer/decimal/text/boolean/date. Dates are ISO YYYY-MM-DD. Numbers are finite and within JavaScript-safe magnitude 9,007,199,254,740,991.

| Operation | Config | Semantics |
|---|---|---|
| remove_duplicates | none | Complete repeated rows, keep first |
| drop_missing | columns optional | Any selected missing cell removes row; empty means all |
| fill_mean / fill_median | column | Observed numbers only; reject all-missing; promote fractional fills |
| fill_category | column, value | Text replacement, nonempty, up to 200 chars |
| rename_column | column, value | Unique header, up to 80 chars |
| drop_columns | columns | Retain at least one |
| normalize_names | none | ASCII snake_case, deterministic collision suffixes |
| convert_type | column, target | Full compatible cast only, no partial conversion |
| trim_whitespace | columns optional | Text trim; empty becomes missing; empty list selects all text |

Functions copy inputs; failed operations cannot mutate the source. Preview is read-only. Apply checks revision and memory under the store lock. Undo replays from original; reset clears history. Zero-row results retain headers but cannot be reimported as useful input.

Profiles exclude missing observations. Duplicate count excludes first occurrences. Sample standard deviation is null with fewer than two numbers. Completeness is populated/total cells, not an invented quality score.

Duplicate suggestions inspect up to 200 unique text values; normalize case/spacing/punctuation/diacritics or use similarity threshold 0.88; show up to 30 pairs. No automatic merges.

Bars: top 12 values. Histograms: up to 10 bins. Lines: first 200 valid rows, sorted date/numeric X. Scatter: first 400 valid pairs. Missing/limited rows are disclosed.

CSV exports include UTF-8 BOM, quoting and formula-leading text apostrophes. Numeric negatives remain numbers. XLSX uses write-only explicitly typed string cells, headers, frozen first row and filters. Source styles, formulas and multiple sheets are not preserved.
