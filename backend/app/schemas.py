from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

OperationKind = Literal[
    "remove_duplicates",
    "drop_missing",
    "fill_mean",
    "fill_median",
    "fill_category",
    "rename_column",
    "drop_columns",
    "convert_type",
    "trim_whitespace",
    "normalize_names",
]


class Operation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    operation: OperationKind
    column: str | None = Field(default=None, max_length=80)
    columns: list[str] = Field(default_factory=list, max_length=50)
    value: str | None = Field(default=None, max_length=200)
    target: Literal["integer", "decimal", "text", "boolean", "date"] | None = None


class TransformationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(gt=0, strict=True)
    transform: Operation


class RevisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(gt=0, strict=True)
