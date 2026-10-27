from pathlib import Path
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field("postgresql+psycopg://mamacare:mamacare@localhost:5432/mamacare", env="DATABASE_URL")
    groq_api_key: str = Field("", env="GROQ_API_KEY")
    groq_api_url: str = Field("https://api.groq.com/openai/v1/responses", env="GROQ_API_URL")
    groq_model: str = Field("openai/gpt-oss-20b", env="GROQ_MODEL")
    cors_origins: List[str] = Field(["*"], env="CORS_ORIGINS")
    redis_url: Optional[str] = Field(None, env="REDIS_URL")
    frontend_dist: Optional[str] = Field(None, env="FRONTEND_DIST")
    jwt_secret_key: str = Field("", env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(60 * 24 * 7, env="JWT_EXPIRE_MINUTES")  # 7 days

    class Config:
        env_file = Path(__file__).resolve().parent.parent.parent / ".env"
        case_sensitive = False


settings = Settings()
