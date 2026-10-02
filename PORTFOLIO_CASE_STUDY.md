# DataForge — portfolio case study

## Problem

Small companies receive messy exports: repeated orders, missing stock quantities, inconsistent names and confusing columns. Manual edits can obscure changes and destroy the original.

## Solution and workflow

Import a CSV or values-only Excel worksheet, or choose fictional demo data. Inspect its profile, preview a cleaning operation, apply it, review history, explore charts and export the result. The original remains separate and registration is unnecessary.

## Key features

Real missing/duplicate/type/statistical profiles; ten pure pandas cleaning functions; original/working previews; revision-aware edits; exact undo/reset; four chart types; advisory similar-value review; safe complete CSV/XLSX exports; private deletion and temporary retention. Desktop and mobile use the same API.

## Architecture

React/TypeScript handles views and session state. FastAPI validates REST requests and delegates to parsing, transformation, profiling, export and storage modules. A single-process memory store keeps original/working frames and compact operation history, scoped by a random HttpOnly session cookie. A same-origin frontend proxy avoids third-party cookies. No database is required for this temporary utility.

## Technical challenges

**Types without damaged identifiers:** retain leading-zero IDs and literal NA/null text; represent blanks with nullable types; reject incompatible casts atomically; promote fractional means.

**Undo within a memory budget:** store operations and replay from the original rather than retaining every full intermediate frame. Tests verify values and dtypes.

**Untrusted spreadsheets:** bound ZIP/XML expansion, entries and coordinates before openpyxl; reject formulas/macros/external links. No user code is accepted.

**Safe export:** protect formula-leading CSV text and mark XLSX strings explicitly. Tests verify output and the intentional CSV apostrophe tradeoff.

**Concurrent UI changes:** preview validity includes configuration and revision. The API rejects stale updates, and asynchronous state updates avoid reopening unrelated datasets.

## Testing

pytest covers pure operations, malformed/hostile fixtures, profiles/charts, exports, ownership, expiry, capacity and conflicts. Vitest checks client inputs and display values. Six real Playwright workflows run on desktop and mobile. GitHub Actions runs the complete suite. Verification notes distinguish observed checks from unexecuted alternatives.

## Privacy

One-hour absolute expiry, explicit deletion and process restart remove datasets. Cookie security, ownership checks, required production Origin and no-store APIs protect session data. Infrastructure may retain request metadata; the demo has no independent security audit or sensitive-data certification. These limits are visible to users.

## Lessons and interview preparation

This AI-assisted implementation offers inspectable examples of pandas nullable dtypes, pure transformations, FastAPI validation, safe containers, optimistic concurrency, retention budgets, frontend races and layered testing. The owner should trace an import-to-export workflow, explain security boundaries and implement an extension before claiming independent proficiency. These are concrete learning opportunities, not invented claims of prior mastery.

## Future development

Shared expiring storage for multiple workers; queued/streaming large imports; user-confirmed duplicate mappings; per-column schema rules; explicit encodings; richer accessible charts. Commercial release would require appropriate licensing/privacy terms, monitoring and independent security review.
