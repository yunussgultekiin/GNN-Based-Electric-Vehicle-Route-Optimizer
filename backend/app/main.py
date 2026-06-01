from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from pathlib import Path
import httpx

from app.core.config import settings
from app.core.logging import RequestIdMiddleware, logger
from app.api.routes.route import router as route_router
from app.api.demo import router as demo_router
from app.services.topology.topology_service import topology_service
from app.services.ml_client import HttpMLClient

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Uygulama başlatılıyor. ML Client yükleniyor...")
    app.state.ml_client = HttpMLClient(base_url=settings.ML_SERVICE_URL)
    try:
        topology_service.load_graph()
    except Exception as e:
        logger.error(f"Harita topolojisi yüklenirken hata oluştu: {e}")
    yield
    logger.info("Uygulama kapatılıyor...")

app = FastAPI(title="GNN EV Route Optimizer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)

app.include_router(route_router)
app.include_router(demo_router)

@app.get("/health", tags=["System"])
async def health_check(request: Request):
    cache_file = Path(settings.GRAPH_CACHE_DIR) / "maltepe_graph.pkl"
    cache_status = "OK" if cache_file.exists() else "Missing (Will download on demand)"

    ml_status = "Unhealthy"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{settings.ML_SERVICE_URL}/health")
            if response.status_code == 200:
                ml_status = "Healthy"
    except Exception:
        ml_status = "Unhealthy / Connection Refused"

    return {
        "status": "Healthy",
        "map_cache": cache_status,
        "ml_service": ml_status
    }

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validasyon Hatası: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Geçersiz istek parametreleri.", "errors": exc.errors()}
    )

@app.exception_handler(httpx.TimeoutException)
async def ml_timeout_exception_handler(request: Request, exc: httpx.TimeoutException):
    logger.error(f"ML Servis Zaman Aşımı Hatası: {exc}")
    return JSONResponse(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        content={"detail": "Yapay zeka modeli yanıt vermedi, işlem zaman aşımına uğradı."}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Beklenmeyen Sistem Hatası: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Sunucu tarafında beklenmeyen bir hata meydana geldi."}
    )
