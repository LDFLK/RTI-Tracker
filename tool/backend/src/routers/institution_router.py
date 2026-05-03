from fastapi import Path
from typing import Annotated
from uuid import UUID
from src.models.request_models import InstitutionRequest
from src.services.institution_service import InstitutionService
from src.repositories.db import SessionDep
from src.models.response_models import InstitutionListResponse, InstitutionResponse
from src.dependencies import RoleChecker
from src.models import UserRole, User
from fastapi import Depends, Query, status
from fastapi.routing import APIRouter

router = APIRouter(prefix="/api/v1", tags=["Institutions"])

def get_institution_service(session: SessionDep):
    return InstitutionService(session)

@router.get("/institutions", response_model=InstitutionListResponse)
def get_institutions_endpoint(
    page: int = Query(1, ge=1, description="page number"),
    page_size: int = Query(10, ge=1, le=100, alias="pageSize", description="page size"),
    service: InstitutionService = Depends(get_institution_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
    ):
    response = service.get_institutions(page=page, page_size=page_size)
    return response

@router.get("/institutions/{institution_id}", response_model=InstitutionResponse)
def get_institution_endpoint(
    institution_id: Annotated[UUID, Path(title="ID of the institution")],
    service: InstitutionService = Depends(get_institution_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    response = service.get_institution(institution_id=institution_id)
    return response

@router.post("/institutions", response_model=InstitutionResponse)
def create_institution_endpoint(
    request: InstitutionRequest,
    service: InstitutionService = Depends(get_institution_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):  
    response = service.create_institution(request=request)
    return response

@router.put("/institutions/{institution_id}", response_model=InstitutionResponse)
def update_institution_endpoint(
    institution_id: Annotated[UUID, Path(title="ID of the institution")],
    request: InstitutionRequest,
    service: InstitutionService = Depends(get_institution_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    response = service.update_institution(institution_id=institution_id, request=request)
    return response

@router.delete("/institutions/{institution_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_institution_endpoint(
    institution_id: Annotated[UUID, Path(title="ID of the institution")],
    service: InstitutionService = Depends(get_institution_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    service.delete_institution(institution_id=institution_id)
    return None

