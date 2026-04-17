import logging
from src.utils.http_client import http_client
from src.routers import rti_template_router, institution_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.core.exceptions import BaseAPIException, api_exception_handler
from src.core.configs import settings

# Configure logging to show INFO level messages
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Lifespan connection starting...")
    await http_client.start()
    yield
    await http_client.close()
    logger.info("Lifespan connection ending...")

app = FastAPI(
    title="RTI Tracker",
    description="A FastAPI backend for RTI tracker",
    version="1.0.0",
    lifespan=lifespan
)

# check for allowed origins
allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
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

app.add_exception_handler(BaseAPIException, api_exception_handler)


