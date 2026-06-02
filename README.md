# GNN-Based Electric Vehicle Route Optimizer

A full-stack web application that minimizes battery consumption for electric vehicles by combining a **Graph Convolutional Network (GCN)** energy predictor with an **energy-weighted Dijkstra** routing engine. The system accounts for dynamic real-world factors — road gradient, speed limit, surface type, traffic density, temperature, wind speed, and weather condition — to find the path that minimizes actual Wh consumed, not just distance traveled.

---

## Team

| Name | Responsibility |
|---|---|
| **Cem Şengül** | Backend (FastAPI, routing engine, topology pipeline) |
| **Yavuz Ömer Dikel** | Frontend (Next.js, Leaflet map, UI/UX) |
| **Yunus Emre Gültekin** | GNN model (EnergyGNN, feature engineering, training, inference service) |

---

## System Overview

```
User selects Origin → Destination on map
              │
              ▼
    Demo Graph (25 nodes, 120 directed edges — Maltepe, Istanbul)
              │
              ▼
    MockDynamicService injects live-simulated conditions
    (temperature, wind_speed, weather_condition, traffic_density)
              │
              ▼
    GNN Payload Builder assembles 10 raw features per edge
              │
              ▼
    EnergyGNN (GCNConv — PyTorch Geometric)
    → raw energy score per edge
              │
              ▼
    Score normalization → Wh per edge  [150–600 Wh/km band]
              │
              ▼
    Energy-Weighted Dijkstra  (min-heap, O((V+E) log V))
              │
              ▼
    Charging Station Injector
    (validates battery range, inserts waypoints if needed)
              │
              ▼
    Route response → Leaflet.js map
    (polyline, charging markers, per-edge energy labels, stats panel)
```

---

## Architecture

Three independently containerized services communicate over HTTP:

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend  —  Next.js 16 + React 19 + Leaflet + Tailwind CSS 4  │
│  Port 3000                                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │  REST / JSON
┌──────────────────────────▼──────────────────────────────────────┐
│  Backend  —  FastAPI + Python 3.11                              │
│  Port 8000                                                      │
│                                                                 │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  routing/        │  │  services/      │  │  topology/     │  │
│  │  dijkstra.py     │  │  gnn_client.py  │  │  osm_client.py │  │
│  │  charging_       │  │  gnn_payload_   │  │  topology_     │  │
│  │  injector.py     │  │  builder.py     │  │  service.py    │  │
│  │  route_          │  │                 │  │                │  │
│  │  builder.py      │  │                 │  │                │  │
│  └──────────────────┘  └────────┬────────┘  └────────────────┘  │
└───────────────────────────────  │  ─────────────────────────────┘
                                  │  REST / JSON
┌─────────────────────────────────▼───────────────────────────────┐
│  Energy Model  —  FastAPI + PyTorch + PyTorch Geometric         │
│  Port 8001                                                      │
│                                                                 │
│  EnergyGNN (GCNConv, 2 layers, hidden=64)                       │
│  k-NN graph construction at inference time                      │
│  Input: 10 raw features → 17 features after engineering         │
│  Output: energy score per edge (float)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | Next.js | 16.2.6 |
| **Frontend** | React | 19.2.4 |
| **Frontend** | react-leaflet / Leaflet.js | 5.0 / 1.9.4 |
| **Frontend** | Tailwind CSS | 4 |
| **Frontend** | TypeScript | 5 |
| **Backend** | FastAPI | latest |
| **Backend** | Python | 3.11 |
| **Backend** | OSMnx | latest |
| **Backend** | NetworkX | latest |
| **Backend** | httpx | latest |
| **Backend** | Pydantic v2 | latest |
| **GNN Model** | PyTorch | 2.2.2 (CUDA — training) / 2.2.2+cpu (inference service) |
| **GNN Model** | PyTorch Geometric | 2.5.3 |
| **GNN Model** | scikit-learn | 1.8.0 |
| **GNN Model** | NumPy | 1.26.4 |
| **Infrastructure** | Docker + Docker Compose | — |

---

## GNN Model — EnergyGNN

### Architecture

```python
class EnergyGNN(nn.Module):
    input_proj:  Linear(17 → 64)
    convs:       ModuleList([GCNConv(64→64), GCNConv(64→64)])   # 2 layers
    skip:        Linear(64 → 64)
    head:        Linear(64 → 1)
    dropout:     0.2
```

- **Input projection** maps 17 features into the hidden space.
- **Two GCNConv layers** (without self-loops) aggregate information from k-nearest-neighbor edges.
- **Skip connection** adds the pre-conv representation to the post-conv output, preventing over-smoothing.
- **Scalar head** outputs a single energy score per node (road segment).

### k-NN Graph Construction

Because road segments are not naturally nodes in a graph, the model builds an ad-hoc connectivity structure at inference time using k-Nearest Neighbors over three columns:

```
KNN_GRAPH_COLS = ['speed_kmh', 'length', 'gradient']
k = min(5, N - 1)
```

Edges in this graph connect road segments that share similar speed regime, length, and grade — a genuine structural prior that a plain MLP cannot exploit. This is the mechanism that makes the model a true GNN rather than a feature-based regressor.

### Features

**10 raw input features (inference-available):**

| Feature | Source | \|r\| vs target |
|---|---|---|
| `speed_kmh` | OSMnx speed limit | 0.793 |
| `battery_soc` | Routing request (%) | 0.214 |
| `length` | OSMnx edge length (km) | 0.466 |
| `wind_speed` | MockDynamicService (m/s) | 0.073 |
| `gradient` | OSMnx edge slope (%) | 0.087 |
| `temperature` | MockDynamicService (°C) | 0.034 |
| `weather_condition` | MockDynamicService (1–4) | 0.019 |
| `surface_type` | OSMnx surface tag (1–3) | 0.019 |
| `traffic_density` | MockDynamicService (1–3) | 0.003 |
| `acceleration` | Derived per surface type | 0.007 |

**7 engineered features (computed in inference pipeline):**

| Feature | Formula | Rationale |
|---|---|---|
| `speed_x_length` | speed × length | Best single predictor (\|r\|=0.822) |
| `speed_sq` | speed² | Aerodynamic drag (dominant term) |
| `power_proxy` | (speed/3.6) × \|acceleration\| | Instantaneous power demand |
| `length_x_gradient` | length × \|gradient\| | Total elevation work |
| `gradient_sq` | gradient² | Non-linear grade resistance |
| `wind_speed_sq` | wind² | Aerodynamic drag proportional to v² |
| `cold_penalty` | max(0, −temperature) | Sub-zero battery efficiency loss |

Total input dimension: **17 features**.

### Excluded Features (and why)

| Feature | Reason |
|---|---|
| `Humidity_%` | \|r\|=0.173 but unavailable at inference |
| `Battery_Temperature_C` | \|r\|=0.141 but unavailable at inference |
| `Battery_Voltage_V` | Redundant with `battery_soc` |
| `Vehicle_Weight_kg` | \|r\|=0.002, no predictive value |
| `Driving_Mode` | Not available in inference pipeline |
| `Tire_Pressure_psi` | Not available in inference pipeline |

### Training Results

| Metric | Value |
|---|---|
| Best epoch | 600 |
| Val MSE | 0.8908 |
| Val MAE | 0.7473 |
| Test MSE | 0.9527 |
| Test MAE | 0.7865 |
| Test RMSE | 0.9761 |
| RMSE % of target mean | **11.6%** |
| Target mean (kWh) | 8.4478 |

### Dataset

**[EV Energy Consumption Dataset — Kaggle](https://www.kaggle.com/datasets/ziya07/ev-energy-consumption-dataset/data)**

Real-time driving behavior, road conditions, weather, and vehicle data for energy prediction. Target column: `Energy_Consumption_kWh`.

### Score → Wh Normalization

The raw GNN output is a unitless score. The backend normalizes it to Wh per edge:

```python
MIN_WH_PER_KM = 150.0   # realistic EV lower bound
MAX_WH_PER_KM = 600.0   # upper bound with high traffic / grade / cold

relative_score = (score − min_score) / score_range
amplified      = relative_score ** 0.5        # non-linear stretch
wh_per_km      = 150 + amplified × (600 − 150)
energy_wh      = wh_per_km × length_km
```

The √ amplification prevents the route optimizer from ignoring small score differences on short edges, giving the GNN signal a meaningful 450 Wh/km band to work with across Dijkstra.

---

## Backend — FastAPI

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health: backend + GNN service status + map cache |
| `GET` | `/demo/graph` | Full demo graph (nodes + edges with geometry) |
| `POST` | `/route/optimal` | Energy-minimizing route with charging stop injection |
| `POST` | `/route/direct` | Distance-minimizing route with GNN energy annotation |

### Route Request / Response

**Request body (`RouteRequest`):**
```json
{
  "origin_node_id": 1,
  "dest_node_id": 20,
  "battery_range_wh": 50000,
  "battery_soc": 80.0
}
```

**Response body (`RouteResponse`):**
```json
{
  "coordinates": [[40.951, 29.124], ...],
  "route_edge_ids": ["1_9", "9_18", ...],
  "edge_energy_labels": [
    { "edge_id": "1_9", "length_km": 1.38, "energy_kwh": 0.245 }
  ],
  "total_energy_wh": 1675.52,
  "distance_m": 8109.44,
  "charging_stops": [],
  "avg_traffic_density": 0.41,
  "global_conditions": { "temperature": 18.0, "wind_speed": 5.2, "weather_condition": 1 },
  "warnings": []
}
```

### Routing Pipeline (per request)

1. **Load demo graph** from `demo_graph.json` into a pure Python adjacency list.
2. **MockDynamicService** generates per-request conditions: temperature, wind speed, weather condition (1=sunny, 2=cloudy, 3=rainy, 4=snowy), and traffic density per edge.
3. **GNN Payload Builder** (`gnn_payload_builder.py`) constructs a feature dict for every edge: resolves surface acceleration, applies traffic, computes the 10 raw features the inference service expects.
4. **GNN Client** (`gnn_client.py`) POSTs all edge features to `http://energy-model:8001/predict` and receives a score list.
5. **Score normalization** maps scores to Wh per edge via the 150–600 Wh/km band.
6. **Dijkstra** (`dijkstra.py`) runs over the energy-weighted adjacency list using `heapq`. Time complexity O((V+E) log V).
7. **Charging Injector** (`charging_injector.py`) checks if `total_energy_wh > battery_range_wh`. If so, it ranks up to 2 candidate charging stations by Haversine distance from origin, runs segmented Dijkstra through each, and selects the station that minimizes total route energy while keeping each segment within battery range.
8. **Route Builder** (`route_builder.py`) assembles the final response: coordinates from edge geometry, per-edge energy labels (kWh), total distance (m), average traffic density, and any warnings.

### Dijkstra Implementation

```python
# Pure Python min-heap Dijkstra — no external graph library
queue = [(0.0, source)]
while queue:
    current_dist, current_node = heapq.heappop(queue)
    for neighbor, _ in adjacency_list[current_node]:
        weight = edge_weights[(current_node, neighbor)]
        if current_dist + weight < distances[neighbor]:
            heapq.heappush(queue, (current_dist + weight, neighbor))
```

The routing engine is fully decoupled from OSMnx and NetworkX — those are only used during graph construction. All routing runs on plain Python dicts.

### Charging Station Injector Logic

```
if total_energy_wh <= battery_range_wh:
    return direct path          # no stop needed

rank charging stations by Haversine(origin → station)
for each top-2 candidate:
    path1 = Dijkstra(origin → station)
    path2 = Dijkstra(station → dest)
    if energy(path1) ≤ range AND energy(path2) ≤ range:
        candidate for best_path

if no valid split found:
    return warning BATTERY_INSUFFICIENT_NEAREST_STATION
```

### Demo Graph

The demo graph covers **Maltepe, Istanbul** — a ~10 km² district along the Sea of Marmara coast.

- **25 nodes**: 20 named road intersections / landmarks + 5 charging stations
- **120 directed edges** (bidirectional pairs derived from 60 base edges)
- **Edge attributes**: `length` (km), `speed_kmh`, `surface_type` (1=asphalt, 2=cobblestone, 3=unpaved), `gradient`, `geometry` (coordinate list)
- Edge lengths range from **0.09 km to 4.46 km**, mean **1.40 km**

**Charging stations in the demo graph:**

| ID | Name |
|---|---|
| 21 | Şarj — Küçükyalı |
| 22 | Şarj — Maltepe Metro |
| 23 | Şarj — Marmaray |
| 24 | Şarj — Bağlarbaşı |
| 25 | Şarj — Esenkent |

### Graph Construction Pipeline (`graph_builder.py`)

When `demo_graph.json` is absent or stale relative to `demo_nodes.json`, the builder:
1. Downloads the OSMnx drive network for `Maltepe, Istanbul, Turkey` (or loads from pickle cache).
2. Snaps each demo node to its nearest OSM node ID (`ox.distance.nearest_nodes`).
3. For each manual edge pair, computes Haversine length, reads speed limit and surface type from OSMnx, and stores bidirectional edge attributes.
4. Serializes the result as `demo_graph.json` (NetworkX node-link format).
5. Validates strong connectivity and logs any unreachable nodes.

The rebuild is triggered automatically — no manual intervention needed.

### Configuration

Environment variables (`.env` file, loaded by Pydantic Settings):

| Variable | Default | Description |
|---|---|---|
| `GNN_SERVICE_URL` | `http://energy-model:8001` | URL of the GNN inference service |
| `GRAPH_CACHE_DIR` | `data/graphs` | OSMnx pickle cache directory |
| `DEFAULT_REGION` | `Maltepe, Istanbul, Turkey` | Fallback region label |
| `OSM_PLACE_NAME` | `Maltepe, Istanbul, Turkey` | OSMnx download query |

### Logging

All application logs use a custom `app_logger` (stdout, `%(asctime)s - %(levelname)s - [ReqID: ...] - %(message)s`). A `RequestIdMiddleware` injects a UUID per request via a `ContextVar`, so every log line is traceable to the originating HTTP request.

Key log events per route request:
```
predict_energy_weights: sending 120 edges to GNN service
GNN service call: POST http://energy-model:8001/predict | edges=120
GNN service response: status=200 | elapsed=42.0 ms
predict_energy_weights: raw scores first_5=[...] min=1.03 max=2.61
normalize_model_scores: score_range=1.58 min=1.03 max=2.61
normalize_model_scores: energy_wh min=20.5 max=1928.0 mean=591.0
Edge energy Wh: min=21 max=1928 mean=591 | edges=120
```

---

## Frontend — Next.js

### Key Design Decisions

**SSR-safe Leaflet:** Leaflet accesses `window` at import time, which breaks Next.js SSR. `RouteMap.tsx` wraps `MapCanvas` in `next/dynamic` with `{ ssr: false }` to defer instantiation to the client.

**Mock API toggle:** A `NEXT_PUBLIC_USE_MOCK_API=true` env flag in `.env.local` routes all API calls to `mock_api.ts` instead of the real backend. This allows frontend development without running the full Docker stack.

**Dual route display:** Both the optimal (GNN energy-weighted) and direct (distance-weighted) routes are computed simultaneously on every calculation. The user can toggle each route on/off independently. Energy saving (Wh and %) is derived from the delta between the two totals.

**Node types on the map:**
- Normal nodes: small circle markers with permanent name labels (visibility controlled by zoom level)
- Charging stations: ⚡ icon with yellow glow
- Origin: green pulsing ring
- Destination: red pulsing ring
- Charging stops on active route: animated ⚡ marker

**Warnings rendered in UI:**
- `BATTERY_INSUFFICIENT_NEAREST_STATION` → "Batarya yetersiz. En yakın şarj istasyonu: {name} ({dist}m uzaklıkta)"
- `BATTERY_INSUFFICIENT_NO_STATION` → "Batarya yetersiz ve çevrede şarj istasyonu bulunamadı."
- `NO_VALID_ROUTE` → route coordinates are empty, no polyline drawn

**Istanbul live clock:** The sidebar footer renders a real-time clock in `Europe/Istanbul` timezone, updating every second via `setInterval`.

### State Management

All application state lives in `page.tsx` with `useState`. There is no external state library. The state includes:

- `originNode / destinationNode` — selected `DemoNode | null`
- `activeField` — which input is awaiting a map click (`"origin" | "destination" | null`)
- `batteryRangeWh` — string input (validated as number before API call)
- `optimalRoute / directRoute` — `RouteResponse | null`
- `showOptimalRoute / showDirectRoute` — polyline visibility toggles
- `isLoading / errorMessage` — UI feedback

### Frontend Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_USE_MOCK_API` | Set `true` to bypass real backend |

---

## Data Flow — End to End

```
1.  User clicks a node on the Leaflet map → sets origin or destination
2.  User enters battery range in Wh and clicks "Rota Hesapla"
3.  Frontend calls fetchOptimalRoute() and fetchDirectRoute() in parallel
4.  Both POST /route/optimal and POST /route/direct hit the FastAPI backend
5.  Backend loads demo adjacency list from demo_graph.json (cached in memory after first load)
6.  MockDynamicService generates: temperature, wind_speed, weather_condition, traffic_density per edge
7.  gnn_payload_builder assembles 10-feature dict per edge
8.  gnn_client POSTs all 120 feature dicts to energy-model:8001/predict
9.  EnergyGNN builds k-NN graph (k=5) over [speed, length, gradient] space
10. Two GCNConv passes + skip connection → scalar score per edge
11. Scores returned to backend as list[float]
12. normalize_model_scores_to_energy_wh maps scores → Wh per edge via √-amplified 150–600 band
13. Dijkstra finds minimum-energy path (optimal) or minimum-distance path (direct)
14. ChargingInjector checks if energy > battery_range; if so, inserts best charging waypoint
15. RouteBuilder assembles coordinates, edge labels, distance, traffic density, warnings
16. Frontend receives both RouteResponse objects
17. MapCanvas draws two polylines (emerald = optimal, orange = direct)
18. SidePanel renders energy stats, saving %, charging stop count, warnings
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose

### Running

```bash
git clone https://github.com/yunussgultekiin/GNN-Based-Electric-Vehicle-Route-Optimizer.git
cd GNN-Based-Electric-Vehicle-Route-Optimizer

cp .env.example .env

docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Backend docs | http://localhost:8000/docs |
| GNN service | http://localhost:8001 |
| Health check | http://localhost:8000/health |

### Environment Setup

Copy `.env.example` to `.env` before the first run:
```bash
# Docker (default — services communicate by container name)
GNN_SERVICE_URL=http://energy-model:8001

# Local development without Docker
# GNN_SERVICE_URL=http://localhost:8001
```

For frontend-only development without the backend:
```bash
# frontend/.env.local
NEXT_PUBLIC_USE_MOCK_API=true
```

---

## Comparison: Distance vs. Energy Routing

| Aspect | Distance-Based (`/route/direct`) | Energy-Based (`/route/optimal`) |
|---|---|---|
| Edge weight | Physical distance (km) | GNN-predicted Wh |
| Uphill roads | Same cost as flat | Higher cost |
| High-speed roads | Lower cost (shorter time) | Context-dependent (speed² drives drag) |
| Traffic congestion | Ignored | Penalized via `traffic_density` feature |
| Cold weather | Ignored | Penalized via `cold_penalty` feature |
| Charging stops | Not considered | Automatically injected if needed |
| Route optimality goal | Shortest path | Minimum battery usage path |
