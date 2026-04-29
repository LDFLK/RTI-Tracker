from fastapi import APIRouter, Depends, Query, status, Path
from typing_extensions import Annotated
from src.services import StatusService
from src.repositories.db import SessionDep
from src.models import StatusResponse, StatusRequest, StatusListResponse
from src.models import User, UserRole
from src.dependencies import RoleChecker
from uuid import UUID

router = APIRouter(prefix="/api/v1", tags=["Statuses"])

def get_status_service(session: SessionDep):
    return StatusService(session)

@router.post("/status", response_model=StatusResponse)
def create_status_endpoint(
    status_request: StatusRequest,
    service: StatusService = Depends(get_status_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.create_status(status_request=status_request)

@router.get("/status", response_model=StatusListResponse)
def get_status_list_endpoint(
    page: int = Query(1, ge=1, description="page number"),
    page_size: int = Query(10, ge=1, le=100, description="page size"),
    service: StatusService = Depends(get_status_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.get_status_list(page=page, page_size=page_size)

@router.get("/status/{status_id}", response_model=StatusResponse)
def get_status_by_id_endpoint(
    status_id: Annotated[UUID, Path(title="ID of the status")],
    service: StatusService = Depends(get_status_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.get_status_by_id(status_id=status_id)

@router.put("/status/{status_id}", response_model=StatusResponse)
def update_status_put_endpoint(
    status_id: Annotated[UUID, Path(title="ID of the status")],
    status_request: StatusRequest,
    service: StatusService = Depends(get_status_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.update_status_put(status_id=status_id, status_request=status_request)

@router.delete("/status/{status_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
def delete_status_endpoint(
    status_id: Annotated[UUID, Path(title="ID of the status")],
    service: StatusService = Depends(get_status_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.delete_status(status_id=status_id)



