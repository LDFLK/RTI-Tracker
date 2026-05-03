from src.services import ReceiverService
from src.repositories.db import SessionDep
from src.models import User, UserRole, ReceiverRequest, ReceiverUpdateRequest
from src.dependencies import RoleChecker
from src.models.response_models import ReceiverListResponse, ReceiverResponse
from fastapi import APIRouter, Query, Depends, Path, status
from uuid import UUID
from typing_extensions import Annotated

router = APIRouter(prefix="/api/v1", tags=["Receivers"])

def get_receiver_service(session: SessionDep):
    return ReceiverService(session)

@router.post("/receivers", response_model=ReceiverResponse)
def create_receiver_endpoint(
    receiver_request: ReceiverRequest,
    service: ReceiverService = Depends(get_receiver_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.create_receiver(receiver_request=receiver_request)

@router.get("/receivers", response_model=ReceiverListResponse)
def get_receiver_endpoint(
    page: int = Query(1, ge=1, description="page number"),
    page_size: int = Query(10, ge=1, le=100, alias="pageSize", description="page size"),
    service: ReceiverService = Depends(get_receiver_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.get_receivers(page=page, page_size=page_size)

@router.get("/receivers/{receiver_id}", response_model=ReceiverResponse)
def get_receiver_by_id_endpoint(
    receiver_id: Annotated[UUID, Path(title="ID of the receiver")],
    service: ReceiverService = Depends(get_receiver_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.get_receiver_by_id(receiver_id=receiver_id)

@router.put("/receivers/{receiver_id}", response_model=ReceiverResponse)
def update_receiver_endpoint(
    receiver_id: Annotated[UUID, Path(title="ID of the receiver")],
    receiver_request: ReceiverUpdateRequest,
    service: ReceiverService = Depends(get_receiver_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.update_receiver(receiver_id=receiver_id, receiver_request=receiver_request)

@router.delete("/receivers/{receiver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_receiver_endpoint(
    receiver_id: Annotated[UUID, Path(title="ID of the receiver")],
    service: ReceiverService = Depends(get_receiver_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    service.delete_receiver(receiver_id=receiver_id)
    return None

