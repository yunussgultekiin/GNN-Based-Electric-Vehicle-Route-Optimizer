from __future__ import annotations
from contextlib import asynccontextmanager
from typing import Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from src.inference import EnergyPredictor

_predictor: EnergyPredictor | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _predictor
    _predictor = EnergyPredictor(artifacts_dir="artifacts/")
    yield

app = FastAPI(title="EV Energy Prediction Service", version="1.0.0", lifespan=lifespan)

class PredictRequest(BaseModel):
    edge_features: list[dict[str, Any]]

class PredictResponse(BaseModel):
    scores: list[float]

@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest) -> PredictResponse:
    if not body.edge_features:
        raise HTTPException(status_code=422, detail="edge_features must not be empty.")
    assert _predictor is not None
    scores = _predictor.predict_edge_scores(body.edge_features)
    return PredictResponse(scores=scores)
