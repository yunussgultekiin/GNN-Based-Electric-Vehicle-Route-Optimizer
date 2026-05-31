from __future__ import annotations

import os

import httpx

_ML_SERVICE_URL = os.environ.get("ML_SERVICE_URL", "http://localhost:8001")


class HttpMLClient:
    def predict(self, edge_features: list[dict]) -> list[float]:
        response = httpx.post(
            f"{_ML_SERVICE_URL}/predict",
            json={"edge_features": edge_features},
        )
        if response.status_code != 200:
            raise RuntimeError(
                f"ML service returned {response.status_code}: {response.text}"
            )
        return response.json()["scores"]
