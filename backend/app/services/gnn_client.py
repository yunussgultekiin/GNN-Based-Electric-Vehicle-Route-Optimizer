from __future__ import annotations
import os
import time
import httpx
from app.core.logging import logger as _logger

_GNN_SERVICE_URL = os.environ.get("GNN_SERVICE_URL", "http://localhost:8001")

class HttpGNNClient:
    def predict(self, edge_features: list[dict]) -> list[float]:
        url = f"{_GNN_SERVICE_URL}/predict"
        _logger.info("GNN service call: POST %s | edges=%d", url, len(edge_features))
        t0 = time.monotonic()
        response = httpx.post(
            url,
            json={"edge_features": edge_features},
        )
        elapsed_ms = (time.monotonic() - t0) * 1000
        _logger.info(
            "GNN service response: status=%d | elapsed=%.1f ms",
            response.status_code,
            elapsed_ms,
        )
        if response.status_code != 200:
            raise RuntimeError(
                f"GNN service returned {response.status_code}: {response.text}"
            )
        return response.json()["scores"]
