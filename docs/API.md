# API reference

All paths start with /api. Private routes require the dataforge_session cookie. Production mutations require the exact APP_ORIGIN Origin header. All API responses are no-store. Errors use {"error":"...","issues":[...]} when validation details apply.

| Method | Path | Behavior |
|---|---|---|
| GET | /health | Public health/version |
| GET / DELETE | /session | Create/reuse session with expiry/limits, or delete all owned data |
| GET | /samples | Fictional sample metadata |
| POST | /samples/{id} | Private copy of sales, contacts or inventory |
| POST | /files/inspect | Multipart file; validate format/list XLSX sheets |
| GET / POST | /datasets | Owned summaries / multipart import |
| GET / DELETE | /datasets/{id} | Full profile, previews, history / delete |
| GET | /datasets/{id}/preview | version original/current, offset 0, limit 25 (max 50) |
| POST | /datasets/{id}/preview-transform | Dry run |
| POST | /datasets/{id}/transform | Apply validated step |
| POST | /datasets/{id}/undo | Remove latest step and replay |
| POST | /datasets/{id}/reset | Restore original |
| GET | /datasets/{id}/duplicates | column query; bounded advisory text pairs |
| GET | /datasets/{id}/chart | kind bar/histogram/line/scatter, x, optional y |
| GET | /datasets/{id}/export | format csv/xlsx; full working attachment |

Import fields: file, optional sheet, delimiter auto/comma/semicolon/tab/pipe.

Transform example: `{"revision":1,"transform":{"operation":"fill_mean","column":"Unit Price"}}`. Undo/reset: `{"revision":2}`. Operations are allowlisted; extra fields are rejected.

Creation 201; deletion 204; invalid inputs 400/422; session missing 401; origin forbidden 403; unowned/missing dataset 404; stale revision/history conflicts 409; oversized input 413; rate limits 429; resource capacity 503; generic unexpected failure 500 with no raw input. Development interactive docs: /api/docs.
