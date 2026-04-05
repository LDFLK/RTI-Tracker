from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import List, Optional, Any

class User(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True, populate_by_name=True)

    id: str = Field(..., alias="sub", description="Unique identifier for the user (Subject)")
    username: str = Field(..., description="User identity name")
    email: Optional[str] = Field(None, description="User's email address")
    roles: List[str] = Field(default_factory=list, description="List of roles assigned to the user")
    active: bool = Field(True, description="Whether the user's session is active")
    scope: Optional[str] = Field(None, description="Permissions scope of the token")

    @model_validator(mode='before')
    @classmethod
    def map_user_attributes(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Normalize Asgardeo/OIDC fields to User model fields
            if 'preferred_username' in data and 'username' not in data:
                data['username'] = data['preferred_username']
            
            if 'groups' in data and not data.get('roles'):
                # Many Asgardeo configs return roles as 'groups'
                groups = data['groups']
                data['roles'] = groups if isinstance(groups, list) else [groups]
            
            # Ensure mandatory 'id' (alias 'sub') exists
            if 'sub' not in data:
                data['sub'] = data.get('username') or data.get('preferred_username')
        return data
