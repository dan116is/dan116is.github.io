from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://lucy02:lucy02@localhost:5432/acr"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
