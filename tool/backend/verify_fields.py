from src.models.common import PaginationModel, ErrorResponse
from src.models.response_models import RTITemplateResponse, RTITemplateListResponse
from src.models.table_schemas import RTITemplate

def verify_model(model_class):
    print(f"\nVerifying model: {model_class.__name__}")
    # Pydantic v2 uses model_fields
    fields = getattr(model_class, 'model_fields', {})
    if not fields:
        # Fallback for SQLModel or Pydantic v1
        fields = getattr(model_class, '__fields__', {})
        
    for name, field in fields.items():
        # Handle both Pydantic v2 (FieldInfo) and v1 (ModelField)
        description = getattr(field, 'description', None)
        print(f"  - {name}: {description}")
        if description is None:
            print(f"    WARNING: Missing description for field '{name}'")

if __name__ == "__main__":
    models = [
        PaginationModel,
        ErrorResponse,
        RTITemplateResponse,
        RTITemplateListResponse,
        RTITemplate
    ]
    for model in models:
        verify_model(model)
