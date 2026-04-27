from src.services import PositionService
from src.repositories.db import SessionDep
from src.models.response_models import PositionListResponse, PositionResponse
from src.models.request_models import PositionRequest
from src.dependencies import RoleChecker
from src.models import UserRole, User
from fastapi import APIRouter, Depends, Query, status
from uuid import UUID

router = APIRouter(prefix="/api/v1", tags=["Positions"])

def get_position_service(session: SessionDep):
    return PositionService(session)

@router.get("/positions", response_model=PositionListResponse)
def get_positions_endpoint(
    page: int = Query(1, ge=1, description="page number"),
    page_size: int = Query(10, ge=1, le=100, description="page size"),
    service: PositionService = Depends(get_position_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
    ):
    response = service.get_positions(page=page, page_size=page_size)
    return response

@router.get("/positions/{position_id}", response_model=PositionResponse)
def get_position_by_id_endpoint(
    position_id: UUID,
    service: PositionService = Depends(get_position_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.get_position_by_id(position_id=position_id)

@router.delete("/positions/{position_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
def delete_position_endpoint(
    position_id: UUID,
    service: PositionService = Depends(get_position_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.delete_position(position_id=position_id)

@router.post("/positions", response_model=PositionResponse)
def create_position_endpoint(
    position_request: PositionRequest,
    service: PositionService = Depends(get_position_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.create_position(position_request=position_request)

@router.patch("/positions/{position_id}", response_model=PositionResponse)
def update_position_patch_endpoint(
    position_id: UUID,
    position_request: PositionRequest,
    service: PositionService = Depends(get_position_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.update_position_patch(position_id=position_id, position_request=position_request)

@router.put("/positions/{position_id}", response_model=PositionResponse)
def update_position_put_endpoint(
    position_id: UUID,
    position_request: PositionRequest,
    service: PositionService = Depends(get_position_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.update_position_put(position_id=position_id, position_request=position_request)
    