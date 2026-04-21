from .rti_template_router import router as rti_template_router
from .institution_router import router as institution_router
from .position_router import router as position_router


__all__ = [
    "rti_template_router",
    "institution_router",
    "position_router"
]