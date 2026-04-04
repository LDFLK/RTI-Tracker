from fastapi import Depends
from typing import Annotated
from src.core.configs import settings
from sqlmodel import create_engine, Session

host = settings.POSTGRES_HOST
port = settings.POSTGRES_PORT

user = settings.POSTGRES_USER
password = settings.POSTGRES_PASSWORD
db = settings.POSTGRES_DB

# Correct PostgreSQL connection URL (includes the database name)
DB_URL = f"postgresql://{user}:{password}@{host}:{port}/{db}"

# SQLModel/SQLAlchemy engine
engine = create_engine(
    DB_URL, 
    pool_pre_ping=True,
)

# dependency to get session
def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]