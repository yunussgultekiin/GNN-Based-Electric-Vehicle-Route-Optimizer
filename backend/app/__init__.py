from fastapi import FastAPI
from app.core.logging import RequestIdMiddleware, logger
from app.api.demo import router as demo_router

app = FastAPI(title="EV Route Optimizer")
app.add_middleware(RequestIdMiddleware)
app.include_router(demo_router)

@app.get("/")
async def root():
    logger.info("Root endpoint'ine istek geldi.")
    return {"message": "API çalışıyor."}
