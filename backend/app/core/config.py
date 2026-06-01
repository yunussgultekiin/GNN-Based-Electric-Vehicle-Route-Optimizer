from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GRAPH_CACHE_DIR: str = "data/graphs"
    ML_SERVICE_URL: str = "http://localhost:8001"
    DEFAULT_REGION: str = "Istanbul, Turkey"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
