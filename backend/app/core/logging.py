import logging
import sys
import uuid
from contextvars import ContextVar
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

# Asenkron işlemler arasında request_id'yi güvenle taşımak için context variable
request_id_context_var: ContextVar[str] = ContextVar("request_id", default="-")

class RequestIdFilter(logging.Filter):
    """Log kayıtlarına o anki request_id'yi enjekte eder."""
    def filter(self, record):
        record.request_id = request_id_context_var.get()
        return True

def setup_logging():
    logger = logging.getLogger("app_logger")
    logger.setLevel(logging.INFO)

    # Log formatında RequestID'yi de gösteriyoruz
    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - [ReqID: %(request_id)s] - %(message)s"
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.addFilter(RequestIdFilter())

    logger.addHandler(handler)
    return logger

logger = setup_logging()

class RequestIdMiddleware(BaseHTTPMiddleware):
    """Her HTTP isteği için benzersiz bir UUID oluşturur ve context'e atar."""
    async def dispatch(self, request: Request, call_next):
        req_id = str(uuid.uuid4())
        token = request_id_context_var.set(req_id)
        
        try:
            response = await call_next(request)
            # İsteğe bağlı olarak client'a dönen header'a da ekleyebiliriz
            response.headers["X-Request-ID"] = req_id
            return response
        finally:
            request_id_context_var.reset(token)