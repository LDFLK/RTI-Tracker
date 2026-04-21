from src.services.institution_service import InstitutionService
from src.repositories.db import SessionDep
from src.models.response_models import InstitutionListResponse
from src.dependencies import RoleChecker
from src.models import UserRole, User
from fastapi import Depends, Query
from fastapi.routing import APIRouter

router = APIRouter(prefix="/api/v1", tags=["Institutions"])

def get_institution_service(session: SessionDep):
    return InstitutionService(session)

@router.get("/institutions", response_model=InstitutionListResponse)
def get_institutions_endpoint(
    page: int = Query(1, ge=1, description="page number"),
    page_size: int = Query(10, ge=1, le=100, description="page size"),
    service: InstitutionService = Depends(get_institution_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
    ):
    response = service.get_institutions(page=page, page_size=page_size)
    return response