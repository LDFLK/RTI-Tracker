FROM python:3.13-slim

# 1. Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 2. Setup user
RUN adduser --disabled-password --gecos "" --home "/nonexistent" --shell "/sbin/nologin" --no-create-home --uid 10014 choreo

WORKDIR /app

# 3. Environment
ENV UV_COMPILE_BYTECODE=1
ENV UV_PROJECT_ENVIRONMENT=/.venv
ENV UV_CACHE_DIR=/tmp/.uv_cache
ENV UV_PYTHON_INSTALL_DIR=/tmp/.uv_python
ENV PATH="/.venv/bin:$PATH"
# Pin uv to the base image's Python — prevents uv from downloading its own CPython
ENV UV_PYTHON=/usr/local/bin/python3

# 4. Prepare directories
RUN mkdir -p /tmp/.uv_cache /tmp/.uv_python /.venv && \
    chown -R choreo:choreo /app /tmp/.uv_cache /tmp/.uv_python /.venv

# 5. Switch to user
USER 10014

# 6. Copy project metadata + source, then do ONE sync with --no-editable
#    --no-editable installs your project as a real package (not a src link),
#    so no second sync is needed after copying code
COPY --chown=10014:10014 pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY --chown=10014:10014 . .
RUN uv sync --frozen --no-dev --no-editable

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]