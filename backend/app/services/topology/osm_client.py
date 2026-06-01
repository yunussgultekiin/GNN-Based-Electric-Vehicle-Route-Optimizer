import os
import pickle
import osmnx as ox
import networkx as nx
from pathlib import Path
from app.core.config import settings
from app.core.logging import logger

# Config'den cache klasör yolunu alıyoruz
CACHE_DIR = Path(settings.GRAPH_CACHE_DIR)

def download_and_cache_graph(place_name: str = "Maltepe, Istanbul, Turkey", filename: str = "maltepe_graph.pkl") -> nx.MultiDiGraph:
    """
    Belirtilen bölgenin yol ağını OSMnx ile indirir ve pickle olarak kaydeder.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    filepath = CACHE_DIR / filename

    logger.info(f"OSMnx üzerinden '{place_name}' indiriliyor, bu işlem birkaç dakika sürebilir...")
    
    # Araçlar (drive) için yol ağını çekiyoruz
    G = ox.graph_from_place(place_name, network_type="drive")
    
    # Hız limitlerini ve tahmini seyahat sürelerini ekliyoruz
    G = ox.add_edge_speeds(G)
    G = ox.add_edge_travel_times(G)

    # İndirilen grafı cache'e kaydet
    with open(filepath, "wb") as f:
        pickle.dump(G, f)

    logger.info(f"Graf başarıyla indirildi ve {filepath} konumuna kaydedildi.")
    return G