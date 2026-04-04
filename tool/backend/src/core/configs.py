from pydantic_settings import SettingsConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_HOST: str
    POSTGRES_PORT: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()