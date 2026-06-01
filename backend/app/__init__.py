# Örnek Kullanım (backend/app/main.py)
from fastapi import FastAPI
from app.core.logging import RequestIdMiddleware, logger
from app.api.demo import router as demo_router
app.include_router(demo_router)

app = FastAPI(title="EV Route Optimizer")

# Middleware'i ekliyoruz
app.add_middleware(RequestIdMiddleware)

@app.get("/")
async def root():
    logger.info("Root endpoint'ine istek geldi.") # Bu logda otomatik olarak ReqID görünecektir
    return {"message": "API çalışıyor."}