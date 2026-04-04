from src.routers import rti_template_router
import logging
from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.core.exceptions import BaseAPIException, api_exception_handler

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

app.add_exception_handler(BaseAPIException, api_exception_handler)

app.include_router(rti_template_router)
