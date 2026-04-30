import logging
from sqlalchemy import text
from src.repositories.db import engine
from src.utils.http_client import http_client

logger = logging.getLogger(__name__)


def ping_db():
    """Synchronous (blocking) db ping helper."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))


def safe_dispose_engine():
    """Attempts to dispose the DB engine, logs full trace on failure."""
    try:
        engine.dispose()
    except Exception:
        logger.exception("Teardown Error: Failed to cleanly dispose DB engine")


async def safe_close_http_client():
    """Attempts to close HTTP client, logs full trace on failure."""
    try:
        await http_client.close()
    except Exception:
        logger.exception("Teardown Error: Failed to close HTTP client")
