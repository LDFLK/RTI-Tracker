from src.routers import rti_template_router
import logging
from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.core.exceptions import BaseAPIException, api_exception_handler
from fastapi_versioning import VersionedFastAPI, version

# Configure logging to show INFO level messages
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Lifespan connection starting...")
    yield
    logger.info("Lifespan connection ending...")

app = FastAPI(
    title="RTI Tracker",
    description="A FastAPI backend for RTI tracker",
    version="1.0.0",
    lifespan=lifespan
)


# health check
@app.get("/health", tags=["Service"])
@version(1)
def health_check():
    return {"status": "Healthy Service"}

app.include_router(rti_template_router)
app.add_exception_handler(BaseAPIException, api_exception_handler)

app = VersionedFastAPI(
    app,
    version_format='{major}',
    prefix_format='/api/v{major}',
    description='A FastAPI backend for RTI tracker'
)

# Register exception handlers for all versioned sub-apps
for route in app.routes:
    if hasattr(route, "app") and isinstance(route.app, FastAPI):
        route.app.add_exception_handler(BaseAPIException, api_exception_handler)

