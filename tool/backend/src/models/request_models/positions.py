from pydantic import BaseModel, Field, ConfigDict

class PositionRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    # attributes
    name: str = Field(...,min_length=1, json_schema_extra={"example":"Minister"}, description="Name of the position.")
