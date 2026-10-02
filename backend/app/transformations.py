"""Pure, explicit transformations. Input frames are never mutated."""

import math
import re
import unicodedata
import pandas as pd
from .config import MAX_SAFE_NUMBER
from .errors import DataError
from .parsing import kind, validate_names
from .schemas import Operation


def _columns(frame: pd.DataFrame, operation: Operation, required: bool = False) -> list[str]:
    columns = operation.columns or ([operation.column] if operation.column else [])
    if required and not columns:
        raise DataError("Choose at least one column.")
    if len(columns) != len(set(columns)):
        raise DataError("Choose each column once.")
    if any(c not in frame for c in columns):
        raise DataError("A selected column no longer exists.")
    return columns or list(frame.columns)


def _column(frame, operation):
    if not operation.column or operation.column not in frame:
        raise DataError("Choose an existing column.")
    return operation.column


def convert(series: pd.Series, target: str) -> pd.Series:
    observed = series.dropna()
    if target == "text":
        return series.map(
            lambda v: (
                pd.NA
                if pd.isna(v)
                else v.date().isoformat()
                if isinstance(v, pd.Timestamp)
                else str(v)
            )
        ).astype("string")
    if target in ["integer", "decimal"]:
        if kind(series) in ["date", "boolean"]:
            raise DataError("Dates and booleans cannot be converted to numeric values.")
        try:
            nums = pd.to_numeric(series.astype("string").str.strip(), errors="raise")
            values = nums.dropna().astype(float)
            if not values.map(math.isfinite).all() or not values.abs().le(MAX_SAFE_NUMBER).all():
                raise ValueError("finite range")
            if target == "integer" and (values % 1 != 0).any():
                raise ValueError("fractional values")
            return nums.astype("Int64" if target == "integer" else "Float64")
        except (ValueError, TypeError, OverflowError) as exc:
            raise DataError(
                "Every non-missing value must be compatible with the chosen numeric type. Fractional values cannot become integers; non-finite or oversized values are rejected."
            ) from exc
    if target == "boolean":
        mapping = {"true": True, "false": False, "yes": True, "no": False, "1": True, "0": False}
        values = observed.astype("string").str.strip().str.lower()
        if not values.isin(mapping).all():
            raise DataError("Boolean conversion accepts only true/false, yes/no, and 1/0.")
        return series.map(
            lambda v: pd.NA if pd.isna(v) else mapping[str(v).strip().lower()]
        ).astype("boolean")
    if target == "date":
        values = observed.astype("string").str.strip()
        if not values.str.fullmatch(r"\d{4}-\d{2}-\d{2}").all():
            raise DataError("Dates must use the unambiguous YYYY-MM-DD format.")
        parsed = pd.to_datetime(
            series.astype("string").str.strip(), format="%Y-%m-%d", errors="coerce"
        )
        if parsed.notna().sum() != len(observed):
            raise DataError("The column contains an invalid calendar date.")
        return parsed
    raise DataError("Choose a supported data type.")


def apply_transform(frame: pd.DataFrame, operation: Operation) -> tuple[pd.DataFrame, str]:
    result = frame.copy(deep=True)
    op = operation.operation
    if op == "remove_duplicates":
        result = result.drop_duplicates(ignore_index=True)
        description = (
            f"Removed {len(frame) - len(result):,} duplicate rows (kept the first occurrence)."
        )
    elif op == "drop_missing":
        columns = _columns(result, operation)
        result = result.dropna(subset=columns).reset_index(drop=True)
        description = (
            f"Removed {len(frame) - len(result):,} rows missing a value in "
            + (", ".join(columns[:3]) + ("…" if len(columns) > 3 else ""))
            + "."
        )
    elif op in ["fill_mean", "fill_median"]:
        column = _column(result, operation)
        if kind(result[column]) not in ["integer", "decimal"]:
            raise DataError("Mean/median filling requires a numeric column.")
        observed = result[column].dropna()
        if observed.empty:
            raise DataError(
                "This column has no observed values from which to calculate a mean or median."
            )
        value = float(observed.mean() if op == "fill_mean" else observed.median())
        if not math.isfinite(value):
            raise DataError("The fill value is not finite.")
        count = int(result[column].isna().sum())
        result[column] = result[column].astype("Float64").fillna(value)
        if kind(frame[column]) == "integer" and value.is_integer():
            result[column] = result[column].astype("Int64")
        description = (
            f"Filled {count:,} missing values in {column} using "
            + ("mean" if op == "fill_mean" else "median")
            + f" ({value:.6g})."
        )
    elif op == "fill_category":
        column = _column(result, operation)
        if kind(result[column]) != "text":
            raise DataError("Categorical filling requires a text column.")
        if operation.value is None or not operation.value.strip():
            raise DataError("Enter a non-empty replacement value.")
        if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", operation.value):
            raise DataError("Replacement text contains unsupported control characters.")
        count = int(result[column].isna().sum())
        result[column] = result[column].fillna(operation.value)
        description = f"Filled {count:,} missing values in {column} with “{operation.value}”."
    elif op == "rename_column":
        column = _column(result, operation)
        if operation.value is None:
            raise DataError("Enter the new column name.")
        name = operation.value.strip()
        names = [name if c == column else c for c in result.columns]
        validate_names(names)
        result.columns = names
        description = f"Renamed {column} to {name}."
    elif op == "drop_columns":
        columns = _columns(result, operation, required=True)
        if len(columns) == len(result.columns):
            raise DataError("Keep at least one column.")
        result = result.drop(columns=columns)
        description = "Removed columns: " + ", ".join(columns) + "."
    elif op == "convert_type":
        column = _column(result, operation)
        if operation.target is None:
            raise DataError("Choose the target data type.")
        result[column] = convert(result[column], operation.target)
        description = f"Converted {column} to {operation.target}."
    elif op == "trim_whitespace":
        columns = _columns(result, operation)
        changed = 0
        for column in columns:
            if kind(result[column]) != "text":
                continue
            old = result[column]
            new = old.str.strip()
            new = new.mask(new.eq(""), pd.NA)
            changed += int((old.fillna("") != new.fillna("")).sum())
            result[column] = new
        description = (
            f"Trimmed whitespace in {changed:,} text cells. Whitespace-only cells become missing."
        )
    elif op == "normalize_names":
        used = set()
        names = []
        for column in result.columns:
            base = unicodedata.normalize("NFKD", column).encode("ascii", "ignore").decode().lower()
            base = re.sub(r"[^a-z0-9]+", "_", base).strip("_") or "column"
            name = base[:70]
            suffix = 2
            while name in used:
                name = base[:70] + "_" + str(suffix)
                suffix += 1
            used.add(name)
            names.append(name)
        count = sum(a != b for a, b in zip(result.columns, names))
        result.columns = names
        description = f"Normalized {count:,} column names to unique snake_case."
    else:
        raise DataError("Unknown transformation.")
    return result.reset_index(drop=True), description
