"""FastAPI adapter; data operations live in dedicated domain modules."""

import asyncio
from contextlib import asynccontextmanager, suppress
import json
import os
from pathlib import Path
import re
from threading import Semaphore
from typing import Annotated, Literal
from uuid import UUID
from fastapi import FastAPI, File, Form, Query, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from .config import Settings, MAX_UPLOAD_BYTES, MAX_ROWS, MAX_COLUMNS, MAX_CELLS
from .errors import DataError
from .exporting import export_csv, export_xlsx
from .parsing import parse_file, inspect_workbook, validate_file
from .profiling import preview, chart_data, duplicate_candidates
from .schemas import TransformationRequest, RevisionRequest
from .security import SecurityMiddleware
from .storage import WorkspaceStore

ROOT = Path(__file__).resolve().parents[2]
SAMPLES = ROOT / "samples"
COOKIE = "dataforge_session"


def create_app(settings: Settings | None = None, store: WorkspaceStore | None = None):
    settings = settings or Settings()
    store = store or WorkspaceStore(settings)
    processing = Semaphore(1)

    @asynccontextmanager
    async def lifespan(application):
        async def clean_expired():
            while True:
                await asyncio.sleep(60)
                await run_in_threadpool(store.prune)

        cleaner = asyncio.create_task(clean_expired())
        yield
        cleaner.cancel()
        with suppress(asyncio.CancelledError):
            await cleaner

    application = FastAPI(
        title="DataForge API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs" if not settings.production else None,
        openapi_url="/api/openapi.json" if not settings.production else None,
    )
    application.state.store = store
    application.add_middleware(SecurityMiddleware, settings=settings)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.origin],
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @application.exception_handler(DataError)
    async def data_error(request, exc):
        return JSONResponse({"error": exc.message}, status_code=exc.status)

    @application.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        issues = [
            {
                "field": ".".join(str(p) for p in issue["loc"] if p != "body"),
                "message": issue["msg"],
            }
            for issue in exc.errors()
        ]
        return JSONResponse(
            {"error": "Check the request fields.", "issues": issues}, status_code=422
        )

    @application.exception_handler(Exception)
    async def unexpected(request, exc):
        # Never log exception text, uploaded content, cookies, or cell values.
        return JSONResponse(
            {"error": "The request could not be completed. Please try again."}, status_code=500
        )

    def token(request):
        return request.cookies.get(COOKIE)

    async def upload_bytes(file):
        try:
            name = (file.filename or "dataset.csv").replace("\\", "/").split("/")[-1]
            if len(name) > 120 or any(c in name for c in "\r\n\x00"):
                raise DataError(
                    "Use a file name of at most 120 characters without control characters."
                )
            data = await file.read(MAX_UPLOAD_BYTES + 1)
            validate_file(name, data)
            return name, data
        finally:
            await file.close()

    @application.get("/api/health")
    def health():
        return {"status": "ok", "storage": "temporary", "version": "1.0.0"}

    @application.get("/api/session")
    def session(request: Request, response: Response):
        value, session, created = store.start(token(request))
        if created:
            response.set_cookie(
                COOKIE,
                value,
                max_age=settings.ttl,
                httponly=True,
                secure=settings.production,
                samesite="lax",
                path="/",
            )
        return {
            "expiresAt": session.expires_at,
            "limits": {
                "uploadBytes": MAX_UPLOAD_BYTES,
                "rows": MAX_ROWS,
                "columns": MAX_COLUMNS,
                "cells": MAX_CELLS,
                "datasets": 3,
                "transformations": 20,
            },
        }

    @application.delete("/api/session", status_code=204)
    def clear(request: Request, response: Response):
        store.clear(token(request))
        response.delete_cookie(
            COOKIE, path="/", secure=settings.production, httponly=True, samesite="lax"
        )

    @application.get("/api/samples")
    def samples():
        return json.loads((SAMPLES / "catalog.json").read_text(encoding="utf-8"))

    @application.post("/api/samples/{sample_id}", status_code=201)
    def load_sample(sample_id: str, request: Request):
        store.session(token(request))
        sample = next((s for s in samples() if s["id"] == sample_id), None)
        if sample is None:
            raise DataError("Sample dataset not found.", 404)
        with processing:
            frame, source = parse_file(
                sample["filename"], (SAMPLES / sample["filename"]).read_bytes(), sample["sheet"]
            )
            return store.add(token(request), sample["filename"], frame, {**source, "sample": True})

    @application.post("/api/files/inspect")
    async def inspect(request: Request, file: Annotated[UploadFile, File()]):
        store.session(token(request))
        name, data = await upload_bytes(file)

        def work():
            with processing:
                return {
                    "filename": name,
                    "format": "XLSX" if name.lower().endswith(".xlsx") else "CSV",
                    "sheets": inspect_workbook(data) if name.lower().endswith(".xlsx") else [],
                }

        return await run_in_threadpool(work)

    @application.get("/api/datasets")
    def list_datasets(request: Request):
        return store.summaries(token(request))

    @application.post("/api/datasets", status_code=201)
    async def upload(
        request: Request,
        file: Annotated[UploadFile, File()],
        sheet: Annotated[str | None, Form(max_length=80)] = None,
        delimiter: Annotated[str, Form()] = "auto",
    ):
        store.session(token(request))
        name, data = await upload_bytes(file)

        def work():
            with processing:
                frame, source = parse_file(name, data, sheet, delimiter)
                return store.add(token(request), name, frame, {**source, "sample": False})

        return await run_in_threadpool(work)

    @application.get("/api/datasets/{id}")
    def details(id: UUID, request: Request):
        return store.details(token(request), str(id))

    @application.delete("/api/datasets/{id}", status_code=204)
    def delete(id: UUID, request: Request):
        store.delete(token(request), str(id))

    @application.get("/api/datasets/{id}/preview")
    def get_preview(
        id: UUID,
        request: Request,
        version: Literal["original", "current"] = "current",
        offset: int = Query(0, ge=0, le=MAX_ROWS),
        limit: int = Query(25, ge=1, le=50),
    ):
        return preview(store.frame(token(request), str(id), version), offset, limit)

    @application.post("/api/datasets/{id}/preview-transform")
    def preview_transform(id: UUID, body: TransformationRequest, request: Request):
        return store.transform(token(request), str(id), body.revision, body.transform, dry_run=True)

    @application.post("/api/datasets/{id}/transform")
    def transform(id: UUID, body: TransformationRequest, request: Request):
        return store.transform(token(request), str(id), body.revision, body.transform)

    @application.post("/api/datasets/{id}/undo")
    def undo(id: UUID, body: RevisionRequest, request: Request):
        return store.undo(token(request), str(id), body.revision)

    @application.post("/api/datasets/{id}/reset")
    def reset(id: UUID, body: RevisionRequest, request: Request):
        return store.reset(token(request), str(id), body.revision)

    @application.get("/api/datasets/{id}/duplicates")
    def duplicates(id: UUID, request: Request, column: str = Query(max_length=80)):
        return duplicate_candidates(store.frame(token(request), str(id)), column)

    @application.get("/api/datasets/{id}/chart")
    def chart(
        id: UUID,
        request: Request,
        kind: str = Query(max_length=20),
        x: str = Query(max_length=80),
        y: str | None = Query(None, max_length=80),
    ):
        return chart_data(store.frame(token(request), str(id)), kind, x, y)

    @application.get("/api/datasets/{id}/export")
    def export(id: UUID, request: Request, format: Literal["csv", "xlsx"]):
        with processing:
            frame = store.frame(token(request), str(id))
            name = store.details(token(request), str(id))["name"]
            data = export_csv(frame) if format == "csv" else export_xlsx(frame)
        filename = re.sub(r"[^A-Za-z0-9_-]+", "_", Path(name).stem)[:80] + "-cleaned." + format
        return Response(
            data,
            media_type="text/csv; charset=utf-8"
            if format == "csv"
            else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    if os.getenv("SERVE_WEB") == "true":
        web = ROOT / "dist"
        application.mount("/assets", StaticFiles(directory=web / "assets"), name="assets")

        @application.get("/{path:path}", include_in_schema=False)
        def frontend(path: str):
            if path.startswith("api/") or path == "api":
                raise DataError("Route not found.", 404)
            return FileResponse(web / "index.html")

    return application


app = create_app()
