"""Explicit, bounded resource settings for a single-worker temporary workspace."""

from dataclasses import dataclass
import os
from dotenv import load_dotenv

load_dotenv()
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 65536
MAX_ROWS = 10000
MAX_COLUMNS = 50
MAX_CELLS = 250000
MAX_CELL_CHARS = 2000
MAX_SAFE_NUMBER = 9007199254740991
MAX_TRANSFORMS = 20


@dataclass(frozen=True)
class Settings:
    origin: str = os.getenv("APP_ORIGIN", "http://127.0.0.1:5176")
    production: bool = os.getenv("ENVIRONMENT", "development") == "production"
    ttl: int = max(60, min(86400, int(os.getenv("SESSION_TTL_SECONDS", "3600"))))
    max_bytes: int = max(1024, min(268435456, int(os.getenv("MAX_STORE_BYTES", "100663296"))))
    request_limit: int = 300
    upload_limit: int = 30
