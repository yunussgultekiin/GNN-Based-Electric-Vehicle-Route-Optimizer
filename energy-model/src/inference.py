from __future__ import annotations
import json
import pickle
from pathlib import Path
from typing import Any, Union
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.neighbors import NearestNeighbors
from torch_geometric.nn import GCNConv

_RAW_INPUT_COLS = (
    "length", "gradient", "temperature", "wind_speed",
    "speed_kmh", "battery_soc", "acceleration",
    "surface_type", "traffic_density", "weather_condition",
)

class EnergyGNN(nn.Module):
    def __init__(self, in_channels, hidden_channels, num_layers, dropout):
        super().__init__()
        self.input_proj = nn.Linear(in_channels, hidden_channels)
        self.convs = nn.ModuleList([
            GCNConv(hidden_channels, hidden_channels, add_self_loops=False)
            for _ in range(num_layers)
        ])
        self.skip = nn.Linear(hidden_channels, hidden_channels)
        self.head = nn.Linear(hidden_channels, 1)
        self.dropout = dropout

    def forward(self, x, edge_index):
        x = self.input_proj(x)
        x_skip = x
        for conv in self.convs:
            x = F.relu(conv(x, edge_index))
            x = F.dropout(x, p=self.dropout, training=self.training)
        x = x + F.relu(self.skip(x_skip))
        return self.head(x).squeeze(-1)


class EnergyPredictor:
    def __init__(self, artifacts_dir: Union[str, Path] = "artifacts/") -> None:
        artifacts_dir = Path(artifacts_dir)

        summary_path = artifacts_dir / "training_summary.json"
        model_path = artifacts_dir / "best_model.pt"
        scaler_path = artifacts_dir / "scaler.pkl"
        encoders_path = artifacts_dir / "encoders.pkl"

        for path in (summary_path, model_path, scaler_path, encoders_path):
            if not path.exists():
                raise FileNotFoundError(f"Required artifact not found: {path.resolve()}")

        with summary_path.open() as fh:
            summary: dict[str, Any] = json.load(fh)

        self._feature_cols: list[str] = summary["feature_cols"]
        self._knn_cols: list[str] = summary["knn_graph_cols"]

        self._model = EnergyGNN(
            in_channels=summary["feature_dim"],
            hidden_channels=summary["hidden_channels"],
            num_layers=summary["num_layers"],
            dropout=summary["dropout"],
        )
        checkpoint = torch.load(model_path, map_location="cpu")
        self._model.load_state_dict(checkpoint["model_state_dict"])
        self._model.eval()

        with scaler_path.open("rb") as fh:
            self._scaler = pickle.load(fh)

        with encoders_path.open("rb") as fh:
            raw_encoders: dict[str, Any] = pickle.load(fh)
        self._encoders: dict[str, dict] = {
            k: v for k, v in raw_encoders.items()
            if k != "meta" and isinstance(v, dict)
        }

    def predict_edge_scores(self, edge_features: list[dict]) -> list[float]:
        if not edge_features:
            raise ValueError("edge_features must not be empty.")

        for i, ef in enumerate(edge_features):
            missing = [k for k in _RAW_INPUT_COLS if k not in ef]
            if missing:
                raise ValueError(
                    f"Edge at index {i} is missing required keys: {missing}"
                )

        data: dict[str, list] = {
            col: [ef[col] for ef in edge_features] for col in _RAW_INPUT_COLS
        }

        for col, mapping in self._encoders.items():
            if col not in data:
                continue
            try:
                data[col] = [mapping[v] for v in data[col]]
            except KeyError as exc:
                raise ValueError(
                    f"Unknown value {exc} for column '{col}'. "
                    f"Valid values: {sorted(mapping.keys())}"
                ) from exc

        knn_matrix = np.column_stack(
            [np.array(data[col], dtype=np.float64) for col in self._knn_cols]
        )

        length = np.array(data["length"], dtype=np.float64)
        gradient = np.array(data["gradient"], dtype=np.float64)
        temperature = np.array(data["temperature"], dtype=np.float64)
        wind_speed = np.array(data["wind_speed"], dtype=np.float64)
        speed_kmh = np.array(data["speed_kmh"], dtype=np.float64)
        acceleration = np.array(data["acceleration"], dtype=np.float64)

        data["gradient_sq"] = (gradient ** 2).tolist()
        data["length_x_gradient"] = (length * gradient).tolist()
        data["cold_penalty"] = np.maximum(0.0, -temperature).tolist()
        data["wind_speed_sq"] = (wind_speed ** 2).tolist()
        data["speed_sq"] = (speed_kmh ** 2).tolist()
        data["power_proxy"] = (acceleration * speed_kmh).tolist()
        data["speed_x_length"] = (speed_kmh * length).tolist()

        feature_matrix = np.column_stack(
            [np.array(data[col], dtype=np.float64) for col in self._feature_cols]
        )  # shape: (N, 17)

        feature_matrix = self._scaler.transform(feature_matrix)

        n = len(edge_features)
        k = min(5, n - 1)
        if k < 1:
            edge_index = torch.zeros((2, 1), dtype=torch.long)
        else:
            nbrs = NearestNeighbors(n_neighbors=k, algorithm="auto").fit(knn_matrix)
            _, indices = nbrs.kneighbors(knn_matrix)
            src = np.repeat(np.arange(n), k)
            dst = indices.ravel()
            edge_index = torch.tensor(
                np.stack([src, dst], axis=0), dtype=torch.long
            )

        x = torch.tensor(feature_matrix, dtype=torch.float32)

        with torch.no_grad():
            scores = self._model(x, edge_index)

        return scores.tolist()
