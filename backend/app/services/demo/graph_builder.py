import json
import math
import os
import pickle
from pathlib import Path
import networkx as nx
import osmnx as ox
from app.core.config import settings
from app.core.logging import logger

DATA_DIR = Path(settings.DATA_DIR)
GRAPH_CACHE_DIR = Path(settings.GRAPH_CACHE_DIR)
NODES_FILE = DATA_DIR / "demo_nodes.json"
GRAPH_FILE = DATA_DIR / "demo_graph.json"
OSM_GRAPH_FILE = GRAPH_CACHE_DIR / "maltepe_graph.pkl"
DEFAULT_SURFACE_TYPE = 1
DEFAULT_SPEED_KMH = 30.0

SURFACE_MAP = {
    "asphalt": 1,
    "paved": 1,
    "concrete": 1,
    "cobblestone": 2,
    "sett": 2,
    "unpaved": 3,
    "gravel": 3,
}

def _ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    GRAPH_CACHE_DIR.mkdir(parents=True, exist_ok=True)

def _load_nodes() -> list[dict]:
    with open(NODES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_nodes(nodes: list[dict]) -> None:
    with open(NODES_FILE, "w", encoding="utf-8") as f:
        json.dump(nodes, f, indent=2, ensure_ascii=False)

def _download_osm_graph() -> nx.MultiDiGraph:
    logger.info(f"Downloading the OSMnx graph: {settings.OSM_PLACE_NAME}")
    graph = ox.graph_from_place(settings.OSM_PLACE_NAME, network_type="drive")
    graph = ox.add_edge_speeds(graph)
    graph = ox.add_edge_travel_times(graph)

    with open(OSM_GRAPH_FILE, "wb") as f:
        pickle.dump(graph, f)

    logger.info(f"The OSMnx graph has been saved: {OSM_GRAPH_FILE}")
    return graph

def _load_osm_graph() -> nx.MultiDiGraph:
    _ensure_dirs()

    if OSM_GRAPH_FILE.exists():
        logger.info(f"Loading the OSMnx graph from the cache: {OSM_GRAPH_FILE}")
        with open(OSM_GRAPH_FILE, "rb") as f:
            return pickle.load(f)

    return _download_osm_graph()

def _snap_nodes_to_osm(osm_graph: nx.MultiDiGraph, nodes: list[dict]) -> list[dict]:
    changed = False
    graph_nodes = set(osm_graph.nodes)

    for node in nodes:
        current_osm_node_id = node.get("osm_node_id")

        if current_osm_node_id and current_osm_node_id in graph_nodes:
            continue

        osm_node_id = ox.distance.nearest_nodes(
            osm_graph,
            X=float(node["lon"]),
            Y=float(node["lat"]),
        )
        node["osm_node_id"] = int(osm_node_id)
        changed = True

    if changed:
        _save_nodes(nodes)
        logger.info("The osm_node_id values in demo_nodes.json have been updated.")

    return nodes

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _build_demo_edge(
    source_node: dict,
    target_node: dict,
) -> dict | None:
    src_lat = float(source_node.get("lat", 0))
    src_lon = float(source_node.get("lon", 0))
    tgt_lat = float(target_node.get("lat", 0))
    tgt_lon = float(target_node.get("lon", 0))

    length_km = _haversine_km(src_lat, src_lon, tgt_lat, tgt_lon)

    if length_km < 0.001:
        return None

    return {
        "length": length_km,
        "speed_kmh": DEFAULT_SPEED_KMH,
        "surface_type": DEFAULT_SURFACE_TYPE,
        "gradient": 0.0,
        "geometry": [[src_lat, src_lon], [tgt_lat, tgt_lon]],
    }

def _reverse_edge_attrs(attrs: dict) -> dict:
    reversed_attrs = dict(attrs)
    reversed_attrs["geometry"] = list(reversed(attrs.get("geometry", [])))
    return reversed_attrs

MANUAL_EDGES: list[tuple[int, int]] = [
    # Perimeter
    (1, 2), (2, 3), (3, 4), (4, 8), (8, 14), (14, 18), (18, 20),
    (20, 19), (19, 17), (17, 12), (12, 10), (10, 5), (5, 2),
    # Northern Landscape
    (1, 3), (2, 4), (4, 5), (3, 6), (4, 6), (3, 7),
    # North-central hub
    (5, 6), (6, 7), (7, 8), (7, 9), (8, 9), (6, 9),
    # Outline
    (6, 10), (6, 11), (7, 11), (9, 11), (5, 12), (10, 12), (5, 10),
    (9, 14), (11, 14), (11, 13),
    # Medium Horizontal
    (10, 13), (10, 15), (13, 15), (13, 16), (15, 16), (14, 16), (12, 15), (7, 13),
    # South
    (15, 17), (16, 17), (16, 18), (16, 19), (17, 19), (18, 19),
    (18, 20), (19, 20), (9, 18), (12, 17), (14, 20), (15, 19),
    # Charging Connections
    (21, 1), (21, 2),
    (22, 5), (22, 10), (22, 12),
    (23, 17), (23, 19),
    (24, 18), (24, 20),
    (25, 19), (25, 20),
]

def build_demo_graph() -> nx.DiGraph:
    _ensure_dirs()
    nodes = _load_nodes()
    osm_graph = _load_osm_graph()
    nodes = _snap_nodes_to_osm(osm_graph, nodes)
    node_map = {int(node["id"]): node for node in nodes}

    final_graph = nx.DiGraph()
    for node in nodes:
        final_graph.add_node(int(node["id"]), **node)

    skipped: list[tuple[int, int]] = []

    for source_id, target_id in MANUAL_EDGES:
        source_node = node_map.get(source_id)
        target_node = node_map.get(target_id)

        if not source_node or not target_node:
            logger.warning(f"Edge ({source_id},{target_id}) skipped: node not found in node list")
            skipped.append((source_id, target_id))
            continue

        edge_attrs = _build_demo_edge(
            source_node=source_node,
            target_node=target_node,
        )

        if not edge_attrs:
            logger.warning(f"Edge ({source_id},{target_id}) skipped: no OSM path found")
            skipped.append((source_id, target_id))
            continue

        if not final_graph.has_edge(source_id, target_id):
            final_graph.add_edge(source_id, target_id, **edge_attrs)

        if not final_graph.has_edge(target_id, source_id):
            final_graph.add_edge(target_id, source_id, **_reverse_edge_attrs(edge_attrs))

    if skipped:
        logger.warning(f"{len(skipped)} edge(s) skipped: {skipped}")

    if nx.is_strongly_connected(final_graph):
        logger.info("Graph is strongly connected.")
    else:
        unreachable: list[int] = []
        if final_graph.nodes:
            root = next(iter(final_graph.nodes))
            reachable = set(nx.descendants(final_graph, root)) | {root}
            unreachable = [n for n in final_graph.nodes if n not in reachable]
        logger.warning(f"Graph is NOT strongly connected. Unreachable nodes: {unreachable}")
        print(f"WARNING: Graph is NOT strongly connected. Unreachable nodes: {unreachable}")

    data_to_save = nx.node_link_data(final_graph, edges="links")

    with open(GRAPH_FILE, "w", encoding="utf-8") as f:
        json.dump(data_to_save, f, indent=2, ensure_ascii=False)

    node_count = len(final_graph.nodes)
    edge_count = len(final_graph.edges)
    print(f"Graph built: {node_count} nodes, {edge_count} directed edges ({len(skipped)} pairs skipped)")
    logger.info(f"demo_graph.json was generated: nodes={node_count} edges={edge_count}")

    return final_graph

def _should_rebuild_graph() -> bool:
    if not GRAPH_FILE.exists():
        return True

    if NODES_FILE.exists() and os.path.getmtime(NODES_FILE) > os.path.getmtime(GRAPH_FILE):
        return True

    if OSM_GRAPH_FILE.exists() and os.path.getmtime(OSM_GRAPH_FILE) > os.path.getmtime(GRAPH_FILE):
        return True

    return False

def load_demo_graph_data() -> dict:
    if _should_rebuild_graph():
        build_demo_graph()

    with open(GRAPH_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_nodes_data() -> dict[int, dict]:
    nodes = _load_nodes()
    return {int(node["id"]): node for node in nodes}

def _get_graph_edges(graph_data: dict) -> list[dict]:
    return graph_data.get("links") or graph_data.get("edges") or []

def get_adjacency_list() -> dict[int, list[tuple[int, dict]]]:
    graph_data = load_demo_graph_data()
    adj_list: dict[int, list[tuple[int, dict]]] = {}

    for node in graph_data.get("nodes", []):
        node_id = int(node["id"])
        adj_list[node_id] = []

    for edge in _get_graph_edges(graph_data):
        source = int(edge["source"])
        target = int(edge["target"])

        attrs = {
            key: value
            for key, value in edge.items()
            if key not in ("source", "target")
        }

        attrs["id"] = f"{source}_{target}"
        adj_list.setdefault(source, []).append((target, attrs))

    return adj_list