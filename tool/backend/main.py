import asyncio
import logging
from src.utils.http_client import http_client
from src.routers import (
    institution_router,
    position_router,
    receiver_router,  
    rti_template_router,
    sender_router
)
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from src.core.configs import settings
from src.core.exceptions import (
    BaseAPIException,
    api_exception_handler,
    validation_exception_handler,
)
from src.routers import (
    institution_router,
    position_router,
    rti_template_router,
    sender_router,
)
from src.utils.http_client import http_client
from src.utils.lifespan_helpers import ping_db, safe_close_http_client, safe_dispose_engine

# Configure logging to show INFO level messages
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# db retrying settings
MAX_RETRIES = settings.MAX_RETRIES
RETRY_DELAY = settings.RETRY_DELAY  # seconds


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Lifespan connection starting...")
    http_client_started = False

    # DB connectivity check
    try:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # run in threadpool to avoid blocking
                await asyncio.to_thread(ping_db)
                logger.info("Database connection successful!")
                # exit retry loop and continue startup on success
                break

            except Exception as e:
                if attempt == MAX_RETRIES:
                    logger.critical(
                        "All DB connection attempts failed. Exiting.", exc_info=True
                    )
                    # Copilot: Exception chaining (from e) preserves original stack trace
                    raise RuntimeError(
                        "Cannot connect to database. Aborting startup."
                    ) from e
                else:
                    logger.warning(
                        "DB connection attempt %s/%s failed",
                        attempt,
                        MAX_RETRIES,
                        exc_info=True,
                    )
                # delay for the next poll
                await asyncio.sleep(RETRY_DELAY)
        # http client startup check
        try:
            await http_client.start()
            http_client_started = True
        except Exception:
            logger.exception("http client failed to start")
            raise
        yield

    finally:
        if http_client_started:
            await safe_close_http_client()
        safe_dispose_engine()
        logger.info("Lifespan connection ending...")


app = FastAPI(
    title="RTI Tracker",
    description="A FastAPI backend for RTI tracker",
    version="1.0.0",
    lifespan=lifespan,
)

# check for allowed origins
allowed_origins = [
    origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()
]
if not allowed_origins:
    raise ValueError("ALLOWED_ORIGINS is not configured")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# health check
@app.get("/health", tags=["Service"])
def health_check():
    return {"status": "Healthy Service"}


app.include_router(rti_template_router)
app.include_router(institution_router)
app.include_router(position_router)
app.include_router(sender_router)
app.include_router(receiver_router)
app.add_exception_handler(BaseAPIException, api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
