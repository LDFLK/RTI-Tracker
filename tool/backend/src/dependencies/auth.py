from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.services import AuthService
from src.core.exceptions import UnauthorizedException
from src.models import User
from functools import lru_cache

@lru_cache(maxsize=1)
def get_auth_service():
    return AuthService()

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    """
    Reusable dependency to verify the opaque token and return a User object.
    Raises UnauthorizedException if the token is invalid or inactive.
    """
    if not credentials:
        raise UnauthorizedException("No authentication token provided")
    
    user_data = auth_service.introspect_token(credentials.credentials)
    if not user_data:
        raise UnauthorizedException("Invalid or expired authentication token")
    
    # Fetch additional user details (email, groups/roles) from Userinfo endpoint
    user_info = auth_service.get_user_info(credentials.credentials)
    if user_info:
        user_data.update(user_info)

    print('user data (merged)')
    print(user_data)
    
    user = User.model_validate(user_data)
    
    print('user object')
    print(user)
    return user
