"""Read-only dataset summaries and bounded visualizations."""

from difflib import SequenceMatcher
import math
import re
import unicodedata
import numpy as np
import pandas as pd
from .errors import DataError
from .parsing import kind


def scalar(value):
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def preview(frame: pd.DataFrame, offset: int = 0, limit: int = 25) -> dict:
    return {
        "columns": list(frame.columns),
        "rows": [
            [scalar(v) for v in row]
            for row in frame.iloc[offset : offset + limit].itertuples(index=False, name=None)
        ],
        "offset": offset,
        "limit": limit,
        "totalRows": len(frame),
    }


def profile(frame: pd.DataFrame) -> dict:
    cells = frame.size
    missing = int(frame.isna().sum().sum())
    columns = []
    for name in frame:
        series = frame[name]
        observed = series.dropna()
        dtype = kind(series)
        counts = observed.value_counts(dropna=True).head(8)
        entry = {
            "name": name,
            "type": dtype,
            "missing": int(series.isna().sum()),
            "unique": int(series.nunique(dropna=True)),
            "topValues": [{"value": scalar(v), "count": int(c)} for v, c in counts.items()],
            "stats": None,
        }
        if dtype in ["integer", "decimal"]:
            entry["stats"] = {
                key: scalar(value)
                for key, value in {
                    "count": len(observed),
                    "min": observed.min(),
                    "max": observed.max(),
                    "mean": observed.mean(),
                    "median": observed.median(),
                    "std": observed.std(ddof=1),
                }.items()
            }
        columns.append(entry)
    return {
        "rows": len(frame),
        "columns": len(frame.columns),
        "missingCells": missing,
        "rowsWithMissing": int(frame.isna().any(axis=1).sum()),
        "duplicateRows": int(frame.duplicated().sum()),
        "completeness": round(100 * (1 - missing / cells), 1) if cells else 100.0,
        "memoryBytes": int(frame.memory_usage(index=True, deep=True).sum()),
        "columnProfiles": columns,
    }


def duplicate_candidates(frame: pd.DataFrame, column: str) -> dict:
    if column not in frame:
        raise DataError("Choose an existing column.")
    if kind(frame[column]) != "text":
        raise DataError("Possible duplicate values are reviewed in text columns.")
    counts = frame[column].dropna().astype("string").value_counts()
    values = list(counts.index[:200])
    pairs = []

    def normalized(value):
        text = unicodedata.normalize("NFKD", value).casefold()
        return re.sub(r"[\W_]+", "", "".join(c for c in text if not unicodedata.combining(c)))

    for i, left in enumerate(values):
        a = normalized(left)
        if not a:
            continue
        for right in values[i + 1 :]:
            b = normalized(right)
            if not b or abs(len(a) - len(b)) > max(3, len(a) // 4):
                continue
            score = 1.0 if a == b else SequenceMatcher(None, a, b, autojunk=False).ratio()
            if score >= 0.88:
                pairs.append(
                    {
                        "left": left,
                        "right": right,
                        "leftCount": int(counts[left]),
                        "rightCount": int(counts[right]),
                        "reason": "Same text after case/spacing/punctuation normalization"
                        if a == b
                        else "Similar spelling — review manually",
                        "similarity": round(score, 3),
                    }
                )
                if len(pairs) >= 30:
                    break
        if len(pairs) >= 30:
            break
    return {
        "column": column,
        "candidates": pairs,
        "reviewedValues": len(values),
        "totalUnique": len(counts),
        "limited": len(counts) > 200 or len(pairs) >= 30,
    }


def chart_data(frame: pd.DataFrame, chart: str, x: str, y: str | None = None) -> dict:
    if x not in frame or y is not None and y not in frame:
        raise DataError("Choose existing chart columns.")
    if chart not in ["histogram", "bar", "line", "scatter"]:
        raise DataError("Choose a supported chart type.")
    data = []
    limited = False
    if chart == "bar":
        observed = frame[x].dropna()
        counts = observed.value_counts().head(12)
        data = [{"x": str(scalar(v)), "y": int(n)} for v, n in counts.items()]
        included = int(counts.sum())
        missing = int(frame[x].isna().sum())
        limited = observed.nunique() > 12
    elif chart == "histogram":
        if kind(frame[x]) not in ["integer", "decimal"]:
            raise DataError("Histograms require a numeric column.")
        observed = frame[x].dropna().astype(float)
        included = len(observed)
        missing = len(frame) - included
        if included:
            counts, edges = np.histogram(observed, bins=min(10, max(1, observed.nunique())))
            data = [
                {"x": f"{edges[i]:.5g}–{edges[i + 1]:.5g}", "y": int(n)}
                for i, n in enumerate(counts)
            ]
    else:
        if y is None or kind(frame[y]) not in ["integer", "decimal"]:
            raise DataError("Choose a numeric Y column.")
        if x == y:
            raise DataError("Choose different X and Y columns.")
        if chart == "scatter" and (kind(frame[x]) not in ["integer", "decimal"] or x == y):
            raise DataError("Scatter plots require two different numeric columns.")
        valid = frame[[x, y]].dropna()
        missing = len(frame) - len(valid)
        if chart == "line" and kind(frame[x]) in ["date", "integer", "decimal"]:
            valid = valid.sort_values(x, kind="stable")
        cap = 400 if chart == "scatter" else 200
        limited = len(valid) > cap
        valid = valid.head(cap)
        included = len(valid)
        data = [
            {"x": scalar(a), "y": scalar(b)} for a, b in valid.itertuples(index=False, name=None)
        ]
    return {
        "kind": chart,
        "xColumn": x,
        "yColumn": y,
        "data": data,
        "includedRows": included,
        "missingRows": missing,
        "totalRows": len(frame),
        "limited": limited,
    }
