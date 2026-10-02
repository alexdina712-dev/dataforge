"""Isolated loopback browser-test adapter; never used by the application launcher."""

from app.config import Settings
from app.main import create_app

# Browser suites make many imports from one IP; security unit tests verify normal limits.
app = create_app(Settings(origin="http://127.0.0.1:5186", upload_limit=100, request_limit=1000))
