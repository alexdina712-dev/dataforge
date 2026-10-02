"""Private in-memory sessions, bounded datasets, and replay-based undo."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import secrets
from threading import RLock
import time
from uuid import uuid4
import pandas as pd
from .config import Settings, MAX_TRANSFORMS
from .errors import DataError
from .profiling import profile, preview
from .schemas import Operation
from .transformations import apply_transform


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def frame_bytes(frame):
    return int(frame.memory_usage(index=True, deep=True).sum())


@dataclass
class Session:
    expires: float
    expires_at: str


@dataclass
class Dataset:
    id: str
    owner: str
    name: str
    source: dict
    original: pd.DataFrame
    current: pd.DataFrame
    created_at: str = field(default_factory=utc_now)
    revision: int = 1
    history: list[dict] = field(default_factory=list)


class WorkspaceStore:
    def __init__(self, settings: Settings, clock=time.monotonic):
        self.settings = settings
        self.clock = clock
        self.lock = RLock()
        self.sessions: dict[str, Session] = {}
        self.datasets: dict[str, Dataset] = {}

    def prune(self):
        with self.lock:
            expired = {key for key, value in self.sessions.items() if value.expires <= self.clock()}
            for key in expired:
                del self.sessions[key]
            self.datasets = {
                key: value for key, value in self.datasets.items() if value.owner not in expired
            }

    @staticmethod
    def digest(token: str):
        return hashlib.sha256(token.encode()).hexdigest()

    def session(self, token: str | None):
        self.prune()
        if not token or len(token) > 100:
            raise DataError("Your temporary session expired. Start a fresh workspace.", 401)
        key = self.digest(token)
        with self.lock:
            if key not in self.sessions:
                raise DataError("Your temporary session expired. Start a fresh workspace.", 401)
            return key, self.sessions[key]

    def start(self, token: str | None):
        try:
            key, session = self.session(token)
            return token, session, False
        except DataError:
            pass
        with self.lock:
            if len(self.sessions) >= 200:
                raise DataError("The demo is busy. Please try again shortly.", 503)
            token = secrets.token_urlsafe(32)
            key = self.digest(token)
            expires_at = datetime.fromtimestamp(
                time.time() + self.settings.ttl, timezone.utc
            ).isoformat()
            session = Session(self.clock() + self.settings.ttl, expires_at)
            self.sessions[key] = session
            return token, session, True

    def clear(self, token: str | None):
        key, _ = self.session(token)
        with self.lock:
            self.datasets = {id: d for id, d in self.datasets.items() if d.owner != key}
            del self.sessions[key]

    def owned(self, token: str | None, id: str):
        key, _ = self.session(token)
        dataset = self.datasets.get(id)
        if not dataset or dataset.owner != key:
            raise DataError("Dataset not found in this workspace.", 404)
        return dataset

    def summaries(self, token: str | None):
        key, _ = self.session(token)
        with self.lock:
            return [self.summary(d) for d in self.datasets.values() if d.owner == key]

    @staticmethod
    def summary(d: Dataset):
        return {
            "id": d.id,
            "name": d.name,
            "source": d.source,
            "rows": len(d.current),
            "columns": len(d.current.columns),
            "revision": d.revision,
            "createdAt": d.created_at,
            "steps": len(d.history),
        }

    def used_bytes(self):
        return sum(frame_bytes(d.original) + frame_bytes(d.current) for d in self.datasets.values())

    def add(self, token: str | None, name: str, frame: pd.DataFrame, source: dict):
        with self.lock:
            key, _ = self.session(token)
            if sum(d.owner == key for d in self.datasets.values()) >= 3:
                raise DataError(
                    "Your temporary workspace holds three datasets. Delete one before importing another.",
                    409,
                )
            if self.used_bytes() + 2 * frame_bytes(frame) > self.settings.max_bytes:
                raise DataError(
                    "The demo has reached its memory limit. Delete a dataset or try a smaller file.",
                    503,
                )
            dataset = Dataset(
                str(uuid4()), key, name, source, frame.copy(deep=True), frame.copy(deep=True)
            )
            self.datasets[dataset.id] = dataset
            return self.details_unlocked(dataset)

    @staticmethod
    def check_revision(d, revision):
        if revision != d.revision:
            raise DataError(
                "This dataset changed in another tab. Refresh it before continuing.", 409
            )

    def details_unlocked(self, d):
        return {
            **self.summary(d),
            "profile": profile(d.current),
            "originalProfile": profile(d.original),
            "currentPreview": preview(d.current, limit=8),
            "originalPreview": preview(d.original, limit=8),
            "history": [{k: v for k, v in h.items() if k != "operation"} for h in d.history],
        }

    def details(self, token, id):
        with self.lock:
            return self.details_unlocked(self.owned(token, id))

    def frame(self, token, id, version="current"):
        with self.lock:
            d = self.owned(token, id)
            return d.original if version == "original" else d.current

    def transform(self, token, id, revision, operation: Operation, dry_run=False):
        with self.lock:
            d = self.owned(token, id)
            self.check_revision(d, revision)
            if len(d.history) >= MAX_TRANSFORMS:
                raise DataError(
                    "This dataset has 20 transformations. Export it, or reset to the original before adding more.",
                    409,
                )
            candidate, description = apply_transform(d.current, operation)
            before = profile(d.current)
            after = profile(candidate)
            if dry_run:
                return {
                    "description": description,
                    "before": before,
                    "after": after,
                    "preview": preview(candidate, limit=8),
                    "revision": d.revision,
                }
            if (
                self.used_bytes() - frame_bytes(d.current) + frame_bytes(candidate)
                > self.settings.max_bytes
            ):
                raise DataError("This transformation would exceed the demo memory limit.", 503)
            d.history.append(
                {
                    "operation": operation.model_dump(),
                    "kind": operation.operation,
                    "description": description,
                    "createdAt": utc_now(),
                    "before": {
                        "rows": before["rows"],
                        "columns": before["columns"],
                        "missingCells": before["missingCells"],
                    },
                    "after": {
                        "rows": after["rows"],
                        "columns": after["columns"],
                        "missingCells": after["missingCells"],
                    },
                }
            )
            d.current = candidate
            d.revision += 1
            return self.details_unlocked(d)

    def undo(self, token, id, revision):
        with self.lock:
            d = self.owned(token, id)
            self.check_revision(d, revision)
            if not d.history:
                raise DataError("There are no transformations to undo.", 409)
            replay = d.original.copy(deep=True)
            for step in d.history[:-1]:
                replay, _ = apply_transform(replay, Operation.model_validate(step["operation"]))
            d.history.pop()
            d.current = replay
            d.revision += 1
            return self.details_unlocked(d)

    def reset(self, token, id, revision):
        with self.lock:
            d = self.owned(token, id)
            self.check_revision(d, revision)
            d.current = d.original.copy(deep=True)
            d.history = []
            d.revision += 1
            return self.details_unlocked(d)

    def delete(self, token, id):
        with self.lock:
            self.owned(token, id)
            del self.datasets[id]
