
from functools import lru_cache
from fastapi import APIRouter,Depends, Query
from src.services import RTITemplateService
from src.repositories.db import SessionDep
from src.models.response_models import RTITemplateListResponse

router = APIRouter(prefix="/v1", tags=["rti-template"])

@lru_cache(maxsize=1)
def get_rti_template_service(session: SessionDep):
    return RTITemplateService(session)

@router.get("/rti_templates", response_model=RTITemplateListResponse)
async def get_rti_templates_endpoint(
    page: int = Query(1, ge=1, description="page number"),
    page_size: int = Query(10, ge=1, le=100, description="page size"),
    service: RTITemplateService = Depends(get_rti_template_service)
    ):
    response = await service.get_rti_templates(page=page, page_size=page_size)
    return response

