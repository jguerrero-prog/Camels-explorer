"""Thin HTTP interface over backend.py - Phase 0 of the CAMELS Studio
rewrite (see STUDIO_PLAN.md). No analysis logic lives here: every endpoint
calls a backend.py function that was already built and verified against
real CAMELS data, and serializes whatever it returns via to_jsonable().

Run from the repo root (not from api/) so `import backend` resolves:
    uvicorn api.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import catalogs, fields, halos, metadata, statistics

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


@app.get("/api/health")
def health():
    return {"status": "ok"}
