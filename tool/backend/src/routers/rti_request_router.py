from fastapi import APIRouter, Depends, Form, UploadFile, File, Query, Path
from typing import Annotated, Optional
from uuid import UUID

from src.services import RTIRequestService, GithubFileService
from src.repositories.db import SessionDep
from src.models.response_models import RTIRequestResponse, RTIRequestListResponse
from src.models.request_models import RTIRequestRequest, RTIRequestUpdateRequest
from src.models import User, UserRole
from src.dependencies import RoleChecker

router = APIRouter(prefix="/api/v1", tags=["RTI-Requests"])

def get_file_service() -> GithubFileService:
    return GithubFileService()

def get_rti_request_service(session: SessionDep, file_service: GithubFileService = Depends(get_file_service)):
    return RTIRequestService(session, file_service)

@router.get("/rti_requests", response_model=RTIRequestListResponse)
async def get_rti_requests_endpoint(
    page: int = Query(1, ge=1, description="page number"),
    page_size: int = Query(10, ge=1, le=100, alias="pageSize", description="page size"),
    service: RTIRequestService = Depends(get_rti_request_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    response = service.get_rti_requests(page=page, page_size=page_size)
    return response

@router.get("/rti_requests/{id}", response_model=RTIRequestResponse)
def get_rti_request_by_id_endpoint(
    id: Annotated[UUID, Path(title="ID of the RTI Request")],
    service: RTIRequestService = Depends(get_rti_request_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.get_rti_request_by_id(request_id=id)

@router.post("/rti_requests", response_model=RTIRequestResponse)
async def create_rti_request_endpoint(
    title: Annotated[str, Form(description="Title of the RTI Request")],
    sender_id: Annotated[UUID, Form(alias="senderId", description="ID of the sender")],
    receiver_id: Annotated[UUID, Form(alias="receiverId", description="ID of the receiver")],
    file: Annotated[UploadFile, File(description="RTI Request file (pdf only)")],
    description: Annotated[Optional[str], Form(description="Detailed description of the RTI Request")] = None,
    rti_template_id: Annotated[Optional[UUID], Form(alias="rtiTemplateId", description="ID of the RTI Template")] = None,
    service: RTIRequestService = Depends(get_rti_request_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    request_data = RTIRequestRequest(
        title=title,
        sender_id=sender_id,
        receiver_id=receiver_id,
        file=file,
        description=description,
        rti_template_id=rti_template_id
    )
    response = await service.create_rti_request(request_data=request_data)
    return response

@router.put("/rti_requests/{id}", response_model=RTIRequestResponse)
async def update_rti_request_endpoint(
    id: Annotated[UUID, Path(title="ID of the RTI Request")],
    title: Annotated[Optional[str], Form(description="Title of the RTI Request")] = None,
    sender_id: Annotated[Optional[UUID], Form(alias="senderId", description="ID of the sender")] = None,
    receiver_id: Annotated[Optional[UUID], Form(alias="receiverId", description="ID of the receiver")] = None,
    file: Annotated[Optional[UploadFile], File(description="RTI Request file (pdf only)")] = None,
    description: Annotated[Optional[str], Form(description="Detailed description of the RTI Request")] = None,
    rti_template_id: Annotated[Optional[UUID], Form(alias="rtiTemplateId", description="ID of the RTI Template")] = None,
    service: RTIRequestService = Depends(get_rti_request_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    request_data = RTIRequestUpdateRequest(
        id=id,
        title=title,
        sender_id=sender_id,
        receiver_id=receiver_id,
        file=file,
        description=description,
        rti_template_id=rti_template_id
    )
    response = await service.update_rti_request(request_data=request_data)
    return response

@router.delete("/rti_requests/{id}", status_code=204)
async def delete_rti_request_endpoint(
    id: Annotated[UUID, Path(title="ID of the RTI Request")],
    service: RTIRequestService = Depends(get_rti_request_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    await service.delete_rti_request(request_id=id)
    return None

    
