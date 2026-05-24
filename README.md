# GNN-Based Electric Vehicle Route Optimizer

A web application that optimizes battery consumption for electric vehicles by combining **Graph Convolutional Networks (GCN)** with a **Dijkstra-based routing engine**, accounting for dynamic real-world factors such as road gradient, traffic density, and weather conditions.

---

## Overview

Traditional EV routing systems minimize distance or time. This system replaces static edge weights with **AI-predicted energy consumption scores**, enabling the routing engine to find the path that minimizes actual battery usage — not just kilometers traveled.

```
User Input (Origin → Destination)
         │
         ▼
  Map Topology (OSM via NetworkX)
         │
         ▼
  GCN Model → Dynamic Energy Scores per Edge
         │
         ▼
  Dijkstra (Energy-Weighted Graph)
         │
         ▼
  Optimal Route + Charging Station Waypoints
         │
         ▼
  Leaflet.js Frontend Visualization
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│   Next.js + Leaflet.js                                  │
└───────────────────┬─────────────────────────────────────┘
                    │ REST / HTTP
┌───────────────────▼─────────────────────────────────────┐
│                   API Gateway                           │
│   FastAPI                                               │
└────────┬──────────────────────┬────────────────────────┘
         │                      │
┌────────▼──────┐      ┌────────▼──────────────────────┐
│  AI Service   │      │      Routing Service           │
│               │      │                                │
│  PyTorch Geo  │      │  NetworkX + OSM topology       │
│  GCN Model    │      │  Adjacency List (pure Python)  │
│  Edge energy  │      │  Priority Queue Dijkstra       │
│  score infer- │      │  Charging station injector     │
│  ence API     │      └────────────────────────────────┘
└───────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js, Leaflet.js |
| **API Gateway** | FastAPI |
| **Graph Model** | PyTorch Geometric (PyG) |
| **Map Topology** | NetworkX, OpenStreetMap (via OSMnx) |
| **Routing Engine** | Pure Python — Adjacency List + Priority Queue Dijkstra |
| **Graph Type** | GCN (Graph Convolutional Network), 2–3 layers |
| **Local Environment** | Docker, Docker Compose |

---

## Core Components

### Map Topology Builder

Downloads the road network for the target region via **OSMnx**, converts it into a **NetworkX** directed graph, and serializes it into a pure Python **Adjacency List** data structure. Edge attributes (length, gradient, speed limit, surface type) are extracted at this stage. Dynamic factors (traffic, weather) are injected at inference time.

---

### GCN Energy Score Predictor

A **Graph Convolutional Network** (Kipf & Welling, 2017) that takes road segment features as node/edge attributes and outputs a predicted energy consumption score per edge.

**Node features per road segment:**

| Feature | Description |
|---|---|
| `grade_percent` | Road gradient (positive = uphill) |
| `speed_limit_kph` | Posted speed limit |
| `surface_encoded` | Road surface type (one-hot) |
| `traffic_score` | Real-time congestion level [0–1] |
| `temperature_c` | Ambient temperature (affects battery chemistry) |
| `precipitation_mm` | Precipitation level (affects rolling resistance) |

---

### Energy-Weighted Dijkstra

Dijkstra over the adjacency list where edge weights are **GCN-predicted energy scores** rather than physical distances. Time complexity: **O((V + E) log V)**. Energy weights are injected externally from the AI service, keeping routing logic decoupled from the ML layer.

---

### Charging Station Injector

After computing the optimal path, validates whether the total predicted energy cost exceeds the vehicle's current battery range. If so, inserts the nearest en-route charging stations as mandatory waypoints and re-runs segmented Dijkstra.

---

## Data Flow

```
1. User selects origin & destination on Leaflet map
2. Frontend POST /route/optimal → API Gateway
3. Gateway fetches map topology for bounding box (cached)
4. Gateway POST /predict/energy-scores → AI Service
   ├── AI Service assembles PyG graph with live dynamic features
   └── GCN forward pass → energy score per edge → returned
5. Gateway passes scored graph to Routing Service
6. Routing Service runs energy-weighted Dijkstra
7. Charging injector validates battery range; inserts stops if needed
8. Final route (coordinates + metadata) returned to frontend
9. Leaflet renders polyline, charging stop markers, energy breakdown
```

---

## Comparison: Distance-Based vs. Energy-Based Routing

| Aspect | Traditional (Distance) | This System (Energy) |
|---|---|---|
| Edge weight | Physical distance (m) | Predicted energy (Wh) |
| Uphill roads | Same cost as flat | Higher cost |
| Traffic congestion | Ignored or time-based | Directly penalized |
| Cold weather | Ignored | Penalized (battery efficiency) |
| Charging stops | Optional / manual | Automatically injected |
| Route optimality | Shortest path | Minimum energy path |

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for running notebooks or training outside Docker)

### Running Locally

```bash
git clone https://github.com/yunussgultekiin/GNN-Based-Electric-Vehicle-Route-Optimizer.git
cd GNN-Based-Electric-Vehicle-Route-Optimizer

docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:8000 |
| AI Service | http://localhost:8001 |
| Routing Service | http://localhost:8002 |
