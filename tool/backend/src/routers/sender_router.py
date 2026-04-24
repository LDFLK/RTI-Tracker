from fastapi import APIRouter, Depends, Query, status
from src.services import SenderService
from src.repositories.db import SessionDep
from src.models import SenderResponse, SenderRequest, SenderListResponse, SenderUpdateRequest
from src.models import User, UserRole
from src.dependencies import RoleChecker
from uuid import UUID

router = APIRouter(prefix="/api/v1", tags=["Senders"])

def get_sender_service(session: SessionDep):
    return SenderService(session)

@router.post("/senders", response_model=SenderResponse)
async def create_sender_endpoint(
    sender_request: SenderRequest,
    service: SenderService = Depends(get_sender_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.create_sender(sender_request=sender_request)

@router.get("/senders", response_model=SenderListResponse)
async def get_sender_list_endpoint(
    page: int = Query(1, ge=1, description="page number"),
    page_size: int = Query(10, ge=1, le=100, description="page size"),
    service: SenderService = Depends(get_sender_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.get_sender_list(page=page, page_size=page_size)

@router.get("/senders/{sender_id}", response_model=SenderResponse)
async def get_sender_by_id_endpoint(
    sender_id: UUID,
    service: SenderService = Depends(get_sender_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.get_sender_by_id(sender_id=sender_id)
    
@router.patch("/senders/{sender_id}", response_model=SenderResponse)
async def update_sender_patch_endpoint(
    sender_id: UUID,
    sender_request: SenderUpdateRequest,
    service: SenderService = Depends(get_sender_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.update_sender_patch(sender_id=sender_id, sender_request=sender_request)

@router.put("/senders/{sender_id}", response_model=SenderResponse)
async def update_sender_put_endpoint(
    sender_id: UUID,
    sender_request: SenderRequest,
    service: SenderService = Depends(get_sender_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.update_sender_put(sender_id=sender_id, sender_request=sender_request)

@router.delete("/senders/{sender_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def delete_sender_endpoint(
    sender_id: UUID,
    service: SenderService = Depends(get_sender_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.delete_sender(sender_id=sender_id)



