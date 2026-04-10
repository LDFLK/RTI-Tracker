from fastapi import Request, status
from fastapi.responses import JSONResponse
from src.models.common import ErrorResponse

class BaseAPIException(Exception):
    """Base exception for all API errors."""
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "Internal Server Error"
    
    def __init__(self, message: str = None):
        self.message = message or "An unexpected error occurred. Please try again later."
        super().__init__(self.message)

    def to_response(self) -> ErrorResponse:
        return ErrorResponse(
            status=self.status_code,
            error=self.error_code,
            message=self.message
        )

class BadRequestException(BaseAPIException):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "Bad Request"

    def __init__(self, message: str = "Bad request"):
        super().__init__(message)

class UnauthorizedException(BaseAPIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "Unauthorized"
    
    def __init__(self, message: str = "Not an authenticated user"):
        super().__init__(message)

class ForbiddenException(BaseAPIException):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "Forbidden"
    
    def __init__(self, message: str = "Permission denied for this resource"):
        super().__init__(message)

class NotFoundException(BaseAPIException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "Not Found"
    
    def __init__(self, message: str = "The requested resource was not found."):
        super().__init__(message)

class ConflictException(BaseAPIException):
    status_code = status.HTTP_409_CONFLICT
    error_code = "Resource Conflict"
    
    def __init__(self, message: str = "A resource conflict occurred."):
        super().__init__(message)

class UnprocessableEntityException(BaseAPIException):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    error_code = "Unprocessable Entity"
    
    def __init__(self, message: str = "Validation failed."):
        super().__init__(message)

class InternalServerException(BaseAPIException):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "Internal Server Error"
    
    def __init__(self, message: str = "An unexpected error occurred. Please try again later."):
        super().__init__(message)

async def api_exception_handler(request: Request, exc: BaseAPIException):
    """Global handler for catch-all BaseAPIException."""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_response().model_dump(mode="json")
    )
    
