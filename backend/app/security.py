"""Bound request bytes before multipart parsing and enforce origin/rate limits."""

from collections import defaultdict, deque
from threading import Lock
import time
from starlette.responses import JSONResponse
from .config import MAX_BODY_BYTES


class SecurityMiddleware:
    def __init__(self, app, settings):
        self.app = app
        self.settings = settings
        self.requests = defaultdict(deque)
        self.uploads = defaultdict(deque)
        self.lock = Lock()

    def limited(self, key, upload):
        now = time.monotonic()
        with self.lock:
            if len(self.requests) > 1000:
                self.requests = {k: v for k, v in self.requests.items() if v and v[-1] > now - 600}
                self.uploads = {k: v for k, v in self.uploads.items() if v and v[-1] > now - 600}
                self.requests = defaultdict(deque, self.requests)
                self.uploads = defaultdict(deque, self.uploads)
                if len(self.requests) > 1000:
                    return True
            requests = self.requests[key]
            while requests and requests[0] <= now - 60:
                requests.popleft()
            if len(requests) >= self.settings.request_limit:
                return True
            requests.append(now)
            if upload:
                imports = self.uploads[key]
                while imports and imports[0] <= now - 600:
                    imports.popleft()
                if len(imports) >= self.settings.upload_limit:
                    return True
                imports.append(now)
            return False

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        method = scope["method"]
        path = scope["path"]

        async def secure_send(message):
            if message["type"] == "http.response.start":
                extra = [
                    (b"cache-control", b"no-store"),
                    (b"x-content-type-options", b"nosniff"),
                    (b"referrer-policy", b"no-referrer"),
                    (b"x-frame-options", b"DENY"),
                ]
                message["headers"] = [
                    (k, v)
                    for k, v in message.get("headers", [])
                    if k.lower() not in {a for a, b in extra}
                ] + extra
            await send(message)

        async def reject(message, status):
            return await JSONResponse({"error": message}, status_code=status)(
                scope, receive, secure_send
            )

        if not path.startswith("/api"):
            return await self.app(scope, receive, secure_send)
        if method not in ["GET", "HEAD", "OPTIONS"]:
            origin = headers.get(b"origin", b"").decode("latin1")
            if origin and origin != self.settings.origin or self.settings.production and not origin:
                return await reject("Request origin is not allowed.", 403)
        ip = (scope.get("client") or ("unknown", 0))[0]
        upload = method == "POST" and (
            path in ["/api/datasets", "/api/files/inspect"] or path.startswith("/api/samples/")
        )
        if self.limited(ip, upload):
            return await reject("Too many requests. Wait a moment and try again.", 429)
        try:
            length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            return await reject("Invalid request length.", 400)
        if length < 0 or length > MAX_BODY_BYTES:
            return await reject("Upload exceeds the 5 MB file limit.", 413)
        chunks = []
        total = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            total += len(chunk)
            if total > MAX_BODY_BYTES:
                return await reject("Upload exceeds the 5 MB file limit.", 413)
            chunks.append(chunk)
            if not message.get("more_body", False):
                break
        replayed = False

        async def replay():
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": b"".join(chunks), "more_body": False}
            return await receive()

        await self.app(scope, replay, secure_send)
