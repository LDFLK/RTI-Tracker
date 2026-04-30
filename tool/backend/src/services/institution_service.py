import logging
from uuid import uuid4, UUID
from src.models import PaginationModel, Institution
from src.models.response_models import InstitutionListResponse, InstitutionResponse
from src.core.exceptions import InternalServerException, ConflictException, NotFoundException, BadRequestException
from sqlmodel import Session, select, func
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

class InstitutionService:
    """
    This service is responsible for executing all institution operations.
    """

    def __init__(self, session: Session):
        self.session = session

    # API
    def get_institutions(
        self,
        *,
        page: int = 1,
        page_size: int = 10
    ) -> InstitutionListResponse:
        try:
            offset = (page - 1) * page_size

            # fetch the records from the table
            statement_records = select(Institution).order_by(Institution.created_at.desc()).offset(offset).limit(page_size)
            results = self.session.exec(statement_records).all()
            
            # fetch the total record count
            statement_count = select(func.count()).select_from(Institution)
            total_items = self.session.exec(statement_count).one()

            # pagination response
            pagination = PaginationModel(
                page=page,
                pageSize=page_size,
                totalItem=total_items,
                totalPages=(total_items + page_size - 1) // page_size if total_items > 0 else 0
            )
            
            # return the final response
            return InstitutionListResponse(
                data=[InstitutionResponse.model_validate(r) for r in results],
                pagination=pagination
            )
        except Exception as e:
            logger.error(f"[INSTITUTION SERVICE] Error fetching Institutions: {e}")
            raise InternalServerException("Failed to fetch Institutions from database.") from e
    
    # API
    def get_institution(
        self,
        *,
        institution_id
    ) -> InstitutionResponse:
        try:
            try:
                target_id = UUID(institution_id) if isinstance(institution_id, str) else institution_id
            except ValueError:
                raise BadRequestException(f"Invalid UUID format: {institution_id}")

            institution = self.session.get(Institution, target_id)

            if not institution:
                raise NotFoundException(f"Institution with id {institution_id} not found.")

            return InstitutionResponse.model_validate(institution)

        except (BadRequestException, NotFoundException):
            raise
        except Exception as e:
            logger.error(f"[INSTITUTION SERVICE] Error reading Institution: {e}")
            raise InternalServerException(f"Failed to read Institution") from e
    
    # API
    def create_institution(
        self,
        *,
        request
    ) -> InstitutionResponse:
        try:
            unique_id = uuid4()

            # institution object to store in the DB
            institution = Institution(
                id=unique_id,
                name=request.name
            )

            self.session.add(institution) 
            self.session.commit()
            self.session.refresh(institution)

            final_response = InstitutionResponse.model_validate(institution)
            return final_response

        except IntegrityError as e:
            self.session.rollback()
            logger.error(f"[INSTITUTION SERVICE] Error creating institution: {e}")
            raise ConflictException("Institution with this name already exists") from e

        except Exception as e:
            self.session.rollback()
            logger.error(f"[INSTITUTION SERVICE] Error creating institution: {e}")
            raise InternalServerException("Failed to create Institution") from e

    # API
    def update_institution(
        self,
        *,
        institution_id,
        request
    ) -> InstitutionResponse:
        try:
            target_id = UUID(institution_id) if isinstance(institution_id, str) else institution_id
        except ValueError:
            raise BadRequestException(f"Invalid UUID format: {institution_id}")

        institution = self.session.get(Institution, target_id)

        if not institution:
            raise NotFoundException(f"Institution with id {institution_id} not found.")
        
        try:
            institution.name = request.name      

            self.session.add(institution)
            self.session.commit()
            self.session.refresh(institution)

            return InstitutionResponse.model_validate(institution)

        except Exception as e:
            self.session.rollback()

            if isinstance(e, IntegrityError):
                logger.error(f"[INSTITUTION SERVICE] Duplicate institution error updating Institution: {e}")
                raise ConflictException("Institution with this name already exists") from e

            logger.error(f"[INSTITUTION SERVICE] Error updating Institution: {e}")
            raise InternalServerException(f"Failed to update Institution") from e

    # API
    def delete_institution(
        self,
        *,
        institution_id
    ) -> None:
        try:
            target_id = UUID(institution_id) if isinstance(institution_id, str) else institution_id
        except ValueError:
            raise BadRequestException(f"Invalid UUID format: {institution_id}")

        institution = self.session.get(Institution, target_id)

        if not institution:
            raise NotFoundException(f"Institution with id {institution_id} not found.")
        
        try:
            # Delete record from DB
            self.session.delete(institution)
            self.session.commit()
            return None

        except IntegrityError:
            self.session.rollback()
            raise ConflictException("Cannot delete Institution because it is used in existing records.")

        except (BadRequestException, NotFoundException, ConflictException):
            raise
        except Exception as e:
            self.session.rollback()
            logger.error(f"[INSTITUTION SERVICE] Error deleting Institution: {e}")
            raise InternalServerException(f"Failed to delete Institution") from e
        
        
