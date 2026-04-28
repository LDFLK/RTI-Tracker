from fastapi import APIRouter, Depends, Query, Form, UploadFile, File, Path, status
from typing import Annotated, Optional
from src.services import RTITemplateService, GithubFileService
from src.repositories.db import SessionDep
from src.models.response_models import RTITemplateListResponse, RTITemplateResponse
from src.models.request_models import RTITemplateRequest
from src.models import User, UserRole
from src.dependencies import RoleChecker

router = APIRouter(prefix="/api/v1", tags=["RTI-Templates"])

def get_file_service() -> GithubFileService:
    return GithubFileService()

def get_rti_template_service(session: SessionDep, file_service: GithubFileService = Depends(get_file_service)):
    return RTITemplateService(session, file_service)

@router.get("/rti_templates", response_model=RTITemplateListResponse)
async def get_rti_templates_endpoint(
    page: int = Query(1, ge=1, description="page number"),
    page_size: int = Query(10, ge=1, le=100, description="page size"),
    service: RTITemplateService = Depends(get_rti_template_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
    ):
    response = service.get_rti_templates(page=page, page_size=page_size)
    return response

@router.post("/rti_templates", response_model=RTITemplateResponse)
async def create_rti_templates_endpoint(
    title: Annotated[str, Form(description="Title of the RTI Template")],
    file: Annotated[UploadFile, File(description="RTI Template markdown file")],
    description: Annotated[Optional[str], Form(description="Detailed description of the RTI Template")] = None,
    service: RTITemplateService = Depends(get_rti_template_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    template_request = RTITemplateRequest(title=title, description=description, file=file)
    response = await service.create_rti_template(template_request=template_request)
    return response

@router.get("/rti_templates/{id}", response_model=RTITemplateResponse)
def get_rti_template_by_id_endpoint(
    id: Annotated[str, Path(title="ID of the RTI Template")],
    service: RTITemplateService = Depends(get_rti_template_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    return service.get_rti_template_by_id(template_id=id)

@router.put("/rti_templates/{id}")
async def update_rti_template_endpoint(
    id: Annotated[str, Path(title="ID of the RTI Template")],
    title: Annotated[Optional[str], Form(description="Title of the RTI Template")] = None,
    file: Annotated[Optional[UploadFile], File(description="RTI Template markdown file")] = None,
    description: Annotated[Optional[str], Form(description="Detailed description of the RTI Template")] = None,
    service: RTITemplateService = Depends(get_rti_template_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    template_request = RTITemplateRequest(id=id, title=title, description=description, file=file)
    response = await service.update_rti_template(template_request=template_request)
    return response

@router.delete("/rti_templates/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rti_template_endpoint(
    id: Annotated[str, Path(title="ID of the RTI Template")],
    service: RTITemplateService = Depends(get_rti_template_service),
    user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.USER]))
):
    await service.delete_rti_template(template_id=id)
    return None




