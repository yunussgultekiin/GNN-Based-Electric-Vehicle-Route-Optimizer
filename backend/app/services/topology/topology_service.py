import pickle
import networkx as nx
from pathlib import Path
from app.core.config import settings
from app.core.logging import logger
from app.services.topology.osm_client import download_and_cache_graph

CACHE_DIR = Path(settings.GRAPH_CACHE_DIR)

SURFACE_MAP: dict[str, int] = {"asphalt": 1, "paved": 1, "cobblestone": 2, "unpaved": 3}

class TopologyService:
    def __init__(self, place_name: str = "Maltepe, Istanbul, Turkey", filename: str = "maltepe_graph.pkl") -> None:
        self.place_name = place_name
        self.filename = filename
        self.filepath = CACHE_DIR / self.filename
        self.graph: nx.MultiDiGraph | None = None

    def load_graph(self) -> nx.MultiDiGraph:
        if self.filepath.exists():
            logger.info(f"Graf cache'den yükleniyor: {self.filepath}")
            with open(self.filepath, "rb") as f:
                self.graph = pickle.load(f)
        else:
            logger.info("Cache bulunamadı. OSM client tetikleniyor...")
            self.graph = download_and_cache_graph(self.place_name, self.filename)
        return self.graph

    def get_adjacency_list(self) -> dict[int, list[tuple[int, dict]]]:
        if self.graph is None:
            self.load_graph()

        adj_list: dict[int, list[tuple[int, dict]]] = {}

        for node in self.graph.nodes:
            adj_list[node] = []

        for u, v, key, data in self.graph.edges(keys=True, data=True):
            length_km = float(data.get("length", 0.0)) / 1000.0

            speed = data.get("speed_kph", 30.0)
            speed_kmh = float(speed[0]) if isinstance(speed, list) else float(speed)

            surface = data.get("surface")
            surface_val = surface[0] if isinstance(surface, list) else surface
            surface_type = SURFACE_MAP.get(surface_val, 1)

            edge_attrs = {
                "length": length_km,
                "speed_kmh": speed_kmh,
                "surface_type": surface_type,
                "gradient": 0.0,
                "osmid": data.get("osmid")
            }

            adj_list[u].append((v, edge_attrs))

        return adj_list

topology_service = TopologyService()
