import json
import math
import networkx as nx
import osmnx as ox
import numpy as np
from sklearn.neighbors import NearestNeighbors
from pathlib import Path

DATA_DIR = Path("data")
NODES_FILE = DATA_DIR / "demo_nodes.json"
GRAPH_FILE = DATA_DIR / "demo_graph.json"

DEFAULT_K_NEIGHBORS: int = 4
MAX_K_NEIGHBORS: int = 8
DEFAULT_SURFACE_TYPE: int = 1
DEFAULT_SPEED_KMH: float = 30.0
OSM_DIST_RADIUS: int = 5000

SURFACE_MAP: dict[str, int] = {"asphalt": 1, "paved": 1, "cobblestone": 2, "unpaved": 3}

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def build_demo_graph() -> nx.DiGraph:
    if not DATA_DIR.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(NODES_FILE, "r", encoding="utf-8") as f:
        nodes = json.load(f)

    coords = np.array([[n["lat"], n["lon"]] for n in nodes])
    center_lat = np.mean(coords[:, 0])
    center_lon = np.mean(coords[:, 1])

    try:
        osm_G = ox.graph_from_point((center_lat, center_lon), dist=OSM_DIST_RADIUS, network_type="drive")
        osm_G = ox.add_edge_speeds(osm_G)
    except Exception as e:
        print(f"OSMnx grafı indirilemedi, fallback kullanılacak. Hata: {e}")
        osm_G = None

    final_G = nx.DiGraph()
    is_connected = False

    for k in range(DEFAULT_K_NEIGHBORS, MAX_K_NEIGHBORS + 1):
        final_G.clear()

        for n in nodes:
            final_G.add_node(n["id"], **n)

        nbrs = NearestNeighbors(n_neighbors=k+1, algorithm='ball_tree', metric='haversine').fit(np.radians(coords))
        _, indices = nbrs.kneighbors(np.radians(coords))

        for i, row in enumerate(indices):
            u_node = nodes[i]
            u_id = u_node["id"]

            for j in row:
                if i == j:
                    continue
                v_node = nodes[j]
                v_id = v_node["id"]

                edge_data = {
                    "gradient": 0.0,
                    "surface_type": DEFAULT_SURFACE_TYPE,
                    "speed_kmh": DEFAULT_SPEED_KMH
                }

                route_found = False
                if osm_G is not None:
                    try:
                        u_osm = ox.distance.nearest_nodes(osm_G, X=u_node["lon"], Y=u_node["lat"])
                        v_osm = ox.distance.nearest_nodes(osm_G, X=v_node["lon"], Y=v_node["lat"])

                        route = nx.shortest_path(osm_G, u_osm, v_osm, weight="length")
                        if len(route) > 1:
                            u_edge = route[0]
                            v_edge = route[1]
                            edge_attrs = osm_G.get_edge_data(u_edge, v_edge)[0]

                            edge_data["length"] = float(edge_attrs.get("length", 0)) / 1000.0

                            speed = edge_attrs.get("speed_kph")
                            if speed:
                                edge_data["speed_kmh"] = float(speed[0]) if isinstance(speed, list) else float(speed)

                            surface = edge_attrs.get("surface")
                            if surface:
                                s_val = surface[0] if isinstance(surface, list) else surface
                                edge_data["surface_type"] = SURFACE_MAP.get(s_val, DEFAULT_SURFACE_TYPE)

                            route_found = True
                    except Exception:
                        pass

                if not route_found:
                    edge_data["length"] = haversine(u_node["lat"], u_node["lon"], v_node["lat"], v_node["lon"])

                final_G.add_edge(u_id, v_id, **edge_data)

        if nx.is_strongly_connected(final_G):
            is_connected = True
            break

    if not is_connected:
        raise RuntimeError(f"k={MAX_K_NEIGHBORS}'de hâlâ strongly connected bir graf oluşturulamadı!")

    data_to_save = nx.node_link_data(final_G)
    with open(GRAPH_FILE, "w", encoding="utf-8") as f:
        json.dump(data_to_save, f, indent=2, ensure_ascii=False)

    return final_G

def get_adjacency_list() -> dict[int, list[tuple[int, dict]]]:
    if not GRAPH_FILE.exists():
        build_demo_graph()

    with open(GRAPH_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    adj_list: dict[int, list[tuple[int, dict]]] = {}
    for node in data["nodes"]:
        adj_list[node["id"]] = []

    for link in data["links"]:
        u = link["source"]
        v = link["target"]
        attrs = {k: v for k, v in link.items() if k not in ("source", "target")}
        adj_list[u].append((v, attrs))

    return adj_list
