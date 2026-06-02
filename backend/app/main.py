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
from app.services.gnn_client import HttpGNNClient

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("The application is starting. The Energy Model Client is being installed.")
    app.state.gnn_client = HttpGNNClient()
    try:
        topology_service.load_graph()
    except Exception as e:
        logger.error(f"An error occurred while loading the map topology: {e}")
    yield
    logger.info("Application is closing.")

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

    gnn_status = "Unhealthy"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{settings.GNN_SERVICE_URL}/health")
            if response.status_code == 200:
                gnn_status = "Healthy"
    except Exception:
        gnn_status = "Unhealthy / Connection Refused"

    return {
        "status": "Healthy",
        "map_cache": cache_status,
        "gnn_service": gnn_status
    }

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation Error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"code": "INVALID_REQUEST_PARAMETERS", "errors": exc.errors()}
    )

@app.exception_handler(httpx.TimeoutException)
async def gnn_timeout_exception_handler(request: Request, exc: httpx.TimeoutException):
    logger.error(f"Energy Model Service Timeout Error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        content={"code": "GNN_MODEL_TIMEOUT"}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected System Error:{str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"code": "INTERNAL_SERVER_ERROR"}
    )
