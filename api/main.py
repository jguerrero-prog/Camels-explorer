"""Thin HTTP interface over backend.py - Phase 0 of the CAMELS Studio
rewrite (see STUDIO_PLAN.md). No analysis logic lives here: every endpoint
calls a backend.py function that was already built and verified against
real CAMELS data, and serializes whatever it returns via to_jsonable().

Run from the repo root (not from api/) so `import backend` resolves:
    uvicorn api.main:app --reload --port 8000
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routers import catalogs, custom, fields, halos, metadata, statistics

app = FastAPI(title="CAMELS Explorer API", version="0.1.0")

# Dev-only allowlist - the real app's Vite dev server (5173) and Storybook
# (6006, so components like AddPlotModal's Curated tab can demo real,
# live-fetched data instead of only the API-down error state). Revisit
# before any real deployment; this is not a production CORS policy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:6006", "http://127.0.0.1:6006",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(statistics.router, prefix="/api")
app.include_router(catalogs.router, prefix="/api")
app.include_router(fields.router, prefix="/api")
app.include_router(halos.router, prefix="/api")
app.include_router(metadata.router, prefix="/api")
app.include_router(custom.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Real (added 2026-08-07, first deploy) - serves the built frontend
# (`npm run build`'s `storybook/dist`) from this same FastAPI process, so
# a deployed instance is one origin/one URL with no CORS involved at all -
# the CORS allowlist above is dev-only (two local servers on different
# ports) and stays unused in this path. Mounted last and conditionally: a
# local `uvicorn api.main:app --reload` dev run (this repo's own normal
# workflow) never has `storybook/dist` built, and StaticFiles raises at
# import time if its directory doesn't exist - guarding on real existence
# keeps the everyday dev command working unchanged. `html=True` serves
# `index.html` for `/` and falls back to it for any unmatched path so the
# client-side app (not server-routed) always loads.
_frontend_dist = Path(__file__).resolve().parent.parent / "storybook" / "dist"
if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
