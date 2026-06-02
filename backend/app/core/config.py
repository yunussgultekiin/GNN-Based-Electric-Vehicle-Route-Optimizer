from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_DATA_DIR = _BACKEND_DIR / "data"
_GRAPH_CACHE_DIR = _DATA_DIR / "graphs"

class Settings(BaseSettings):
    DATA_DIR: str = str(_DATA_DIR)
    GRAPH_CACHE_DIR: str = str(_GRAPH_CACHE_DIR)
    GNN_SERVICE_URL: str = "http://localhost:8001"
    DEFAULT_REGION: str = "Istanbul, Turkey"
    OSM_PLACE_NAME: str = "Maltepe, Istanbul, Turkey"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()