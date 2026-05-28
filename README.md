# GNN-Based Electric Vehicle Route Optimizer

A web application that optimizes battery consumption for electric vehicles by combining **Graph Convolutional Networks (GCN)** with a **Dijkstra-based routing engine**, accounting for dynamic real-world factors such as road gradient, traffic density, and weather conditions.

---

## Overview

Traditional EV routing systems minimize distance or time. This system replaces static edge weights with **AI-predicted energy consumption scores**, enabling the routing engine to find the path that minimizes actual battery usage — not just kilometers traveled.

```
User Input (Origin → Destination)
         │
         ▼
  Map Topology (OSM via OSMnx)
         │
         ▼
  Pure Python Adjacency List
         │
         ▼
  GCN Model → Dynamic Energy Scores per Edge
         │
         ▼
  Dijkstra (Energy-Weighted Adjacency List)
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
│                 Next.js + Leaflet.js                    │
└───────────────────┬─────────────────────────────────────┘
                    │ REST / HTTP
┌───────────────────▼─────────────────────────────────────┐
│                   Backend (FastAPI)                     │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │  ml/         │   │  routing/    │   │  topology/  │  │
│  │              │   │              │   │             │  │
│  │  PyTorch Geo │   │  Adjacency   │   │  OSMnx      │  │
│  │  GCN Model   │   │  List        │   │  graph      │  │
│  │  Edge energy │   │  Priority    │   │  downloader │  │
│  │  inference   │   │  Queue       │   │  & parser   │  │
│  │              │   │  Dijkstra    │   │             │  │
│  │              │   │  Charging    │   │             │  │
│  │              │   │  Injector    │   │             │  │
│  └──────────────┘   └──────────────┘   └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js, Leaflet.js |
| **Backend** | FastAPI |
| **Graph Model** | PyTorch Geometric (PyG) |
| **Map Data Source** | OpenStreetMap (via OSMnx) |
| **Graph Structure** | Pure Python — Adjacency List |
| **Routing Engine** | Pure Python — Priority Queue Dijkstra |
| **Graph Type** | GCN (Graph Convolutional Network), 2–3 layers |
| **Local Environment** | Docker, Docker Compose |

---

## Dataset

**[EV Energy Consumption Dataset](https://www.kaggle.com/datasets/ziya07/ev-energy-consumption-dataset/data)** — Kaggle

> Real-time Driving Behavior, Road, Weather & Vehicle Data for Energy Prediction

A comprehensive EV energy consumption dataset combining real-time driving behavior, road conditions, weather, and vehicle data. Used for training the GCN model.

---

## Core Components

### Map Topology Builder

Downloads the road network for the target region via **OSMnx**, then converts it into a pure Python **Adjacency List** data structure — OSMnx is used exclusively as a data source, not as a routing backend. Edge attributes (length, gradient, speed limit, surface type) are extracted at this stage. Dynamic factors (traffic, weather) are provided by a mock service at inference time.

---

### GCN Energy Score Predictor

A **Graph Convolutional Network** trained on the EV Energy Consumption Dataset. The model learns the relationship between road segment features and energy consumption, then generalizes to unseen edges at inference time.

---

### Energy-Weighted Dijkstra

Dijkstra over the adjacency list where edge weights are **GCN-predicted energy scores** rather than physical distances. Uses a **min-heap priority queue** (`heapq`) for node selection. Time complexity: **O((V + E) log V)**. Energy weights are injected from the ML module, keeping routing logic decoupled from the model layer.

---

### Charging Station Injector

After computing the optimal path, validates whether the total predicted energy cost exceeds the vehicle's current battery range. If so, inserts the nearest en-route charging stations as mandatory waypoints and re-runs segmented Dijkstra.

---

### Mock Dynamic Feature Service

A lightweight service that generates realistic dynamic feature values at inference time: traffic density, ambient temperature, wind speed, and weather condition. Decouples the routing pipeline from external API dependencies.

---

## Data Flow

```
1. User selects origin & destination on Leaflet map
2. Frontend POST /route/optimal → Backend API
3. Backend builds adjacency list from cached OSMnx topology
4. Mock service injects dynamic features (traffic, weather, wind)
5. GCN forward pass over road graph → energy score per edge
6. Energy scores injected as edge weights into adjacency list
7. Priority queue Dijkstra finds minimum energy path
8. Charging injector validates battery range; inserts stops if needed
9. Final route (coordinates + metadata) returned to frontend
10. Leaflet renders polyline, charging stop markers, energy breakdown
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
| Backend  | http://localhost:8000 |
