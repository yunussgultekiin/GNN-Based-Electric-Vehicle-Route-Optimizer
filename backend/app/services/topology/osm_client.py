import pickle
import osmnx as ox
import networkx as nx
from pathlib import Path
from app.core.config import settings
from app.core.logging import logger

CACHE_DIR = Path(settings.GRAPH_CACHE_DIR)

def download_and_cache_graph(place_name: str = "Maltepe, Istanbul, Turkey", filename: str = "maltepe_graph.pkl") -> nx.MultiDiGraph:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    filepath = CACHE_DIR / filename

    logger.info(f"Downloading '{place_name}' via OSMnx, this may take a few minutes...")

    G = ox.graph_from_place(place_name, network_type="drive")
    G = ox.add_edge_speeds(G)
    G = ox.add_edge_travel_times(G)

    with open(filepath, "wb") as f:
        pickle.dump(G, f)

    logger.info(f"Graph downloaded successfully and saved to {filepath}.")
    return G
