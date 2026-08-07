# Real, first deploy config (2026-08-07) - one container serving both the
# built frontend and the FastAPI backend from a single process/origin (see
# api/main.py's own static-file mount comment for why: no CORS needed in
# production this way). Multi-stage so the final image only carries the
# Python runtime + the frontend's already-built static output, not Node/
# npm or the frontend's node_modules.

# Matches .github/workflows/ci.yml's own node-version: 20.
FROM node:20-slim AS frontend-build
WORKDIR /app/storybook
COPY storybook/package.json storybook/package-lock.json ./
RUN npm ci
COPY storybook/ ./
RUN npm run build

# Matches .python-version.
FROM python:3.9-slim
WORKDIR /app

# requirements-server.txt, not requirements.txt - see its own comment for
# why (streamlit/pywebview are desktop-app-only, not imported by api/ or
# backend.py, and pywebview needs GUI libs this headless image doesn't have).
COPY requirements-server.txt ./
RUN pip install --no-cache-dir -r requirements-server.txt

COPY backend.py ./
COPY api/ ./api/
COPY --from=frontend-build /app/storybook/dist ./storybook/dist

# Railway (and most PaaS hosts) inject $PORT at runtime - shell-form CMD
# so it's actually substituted, not treated as a literal "$PORT".
ENV PORT=8000
CMD uvicorn api.main:app --host 0.0.0.0 --port $PORT
