from src.services import PositionService
from src.repositories.db import SessionDep
from src.models.response_models import PositionListResponse
from src.dependencies import RoleChecker
from src.models import UserRole, User
from fastapi import Depends, Query
from fastapi.routing import APIRouter

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
