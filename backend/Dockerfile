# ---- base: production image ----------------------------------------------
FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

# Copy source and install the package + its runtime dependencies.
# (asyncpg / pydantic-core ship wheels, so no compiler toolchain is needed.)
COPY . .
RUN pip install --upgrade pip && pip install .

RUN chmod +x /app/docker-entrypoint.sh
EXPOSE 8000

# Entrypoint runs `alembic upgrade head`, then execs the CMD (the server).
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# ---- dev: adds dev tooling + editable install for hot reload -------------
FROM base AS dev
RUN pip install -e ".[dev]"
