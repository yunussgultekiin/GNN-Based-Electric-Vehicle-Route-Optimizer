from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Proje gereksinimlerine göre varsayılan değerler atandı
    GRAPH_CACHE_DIR: str = "data/graphs"
    ML_SERVICE_URL: str = "http://localhost:8001"
    DEFAULT_REGION: str = "Istanbul, Turkey"

    # .env dosyasından okuma yapabilmesi için konfigürasyon
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

# Uygulamanın her yerinden bu nesneyi import edip kullanacağız
settings = Settings()