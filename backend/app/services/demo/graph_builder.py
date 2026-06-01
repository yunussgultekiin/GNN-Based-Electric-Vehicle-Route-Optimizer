import json
import os
import math
import networkx as nx
import osmnx as ox
import numpy as np
from sklearn.neighbors import NearestNeighbors
from pathlib import Path

DATA_DIR = Path("data")
NODES_FILE = DATA_DIR / "demo_nodes.json"
GRAPH_FILE = DATA_DIR / "demo_graph.json"

def haversine(lat1, lon1, lat2, lon2):
    """İki koordinat arasındaki kuş uçuşu mesafeyi km cinsinden hesaplar."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def build_demo_graph():
    """k-NN kullanarak node'ları bağlar ve OSMnx verileriyle demo_graph.json oluşturur."""
    if not DATA_DIR.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(NODES_FILE, "r", encoding="utf-8") as f:
        nodes = json.load(f)

    coords = np.array([[n["lat"], n["lon"]] for n in nodes])
    
    # OSMnx üzerinden bölgenin grafını çek (Tüm noktaları kapsayacak bir merkez noktası ve yarıçap)
    center_lat = np.mean(coords[:, 0])
    center_lon = np.mean(coords[:, 1])
    
    try:
        osm_G = ox.graph_from_point((center_lat, center_lon), dist=5000, network_type="drive")
        osm_G = ox.add_edge_speeds(osm_G)
    except Exception as e:
        print(f"OSMnx grafı indirilemedi, fallback kullanılacak. Hata: {e}")
        osm_G = None

    final_G = nx.DiGraph()
    is_connected = False

    # k=4'ten k=8'e kadar strongly connected olana kadar dene
    for k in range(4, 9):
        print(f"k={k} için graf oluşturuluyor...")
        final_G.clear()
        
        for n in nodes:
            final_G.add_node(n["id"], **n)

        # Kendisi hariç en yakın k komşuyu bul
        nbrs = NearestNeighbors(n_neighbors=k+1, algorithm='ball_tree', metric='haversine').fit(np.radians(coords))
        _, indices = nbrs.kneighbors(np.radians(coords))

        for i, row in enumerate(indices):
            u_node = nodes[i]
            u_id = u_node["id"]
            
            for j in row:
                if i == j: continue
                v_node = nodes[j]
                v_id = v_node["id"]

                edge_data = {
                    "gradient": 0.0,
                    "surface_type": 1, # 0 geçersiz olduğu için fallback 1
                    "speed_kmh": 30.0
                }

                # OSMnx ile yol bulmayı dene
                route_found = False
                if osm_G is not None:
                    try:
                        u_osm = ox.distance.nearest_nodes(osm_G, X=u_node["lon"], Y=u_node["lat"])
                        v_osm = ox.distance.nearest_nodes(osm_G, X=v_node["lon"], Y=v_node["lat"])
                        
                        route = nx.shortest_path(osm_G, u_osm, v_osm, weight="length")
                        if len(route) > 1:
                            # Sadece ilk segmentin verisini almak yeterli (demo için)
                            u_edge = route[0]
                            v_edge = route[1]
                            edge_attrs = osm_G.get_edge_data(u_edge, v_edge)[0]
                            
                            edge_data["length"] = float(edge_attrs.get("length", 0)) / 1000.0 # metre -> km
                            
                            speed = edge_attrs.get("speed_kph")
                            if speed:
                                # Speed liste formatında gelebiliyor ['30', '50']
                                edge_data["speed_kmh"] = float(speed[0]) if isinstance(speed, list) else float(speed)
                            
                            surface = edge_attrs.get("surface")
                            if surface:
                                # Yüzey tiplerine göre basit bir map (örnek)
                                surface_map = {"asphalt": 1, "paved": 1, "cobblestone": 2, "unpaved": 3}
                                s_val = surface[0] if isinstance(surface, list) else surface
                                edge_data["surface_type"] = surface_map.get(s_val, 1)

                            route_found = True
                    except Exception:
                        pass # OSMnx'te yol bulunamazsa fallback'e düş

                # Fallback
                if not route_found:
                    edge_data["length"] = haversine(u_node["lat"], u_node["lon"], v_node["lat"], v_node["lon"])

                final_G.add_edge(u_id, v_id, **edge_data)

        if nx.is_strongly_connected(final_G):
            is_connected = True
            break

    if not is_connected:
        raise RuntimeError("k=8'de hâlâ strongly connected bir graf oluşturulamadı!")

    # JSON olarak kaydet
    data_to_save = nx.node_link_data(final_G)
    with open(GRAPH_FILE, "w", encoding="utf-8") as f:
        json.dump(data_to_save, f, indent=2, ensure_ascii=False)
    
    print(f"Graf başarıyla {GRAPH_FILE} konumuna kaydedildi (k={k}).")
    return final_G

def get_adjacency_list() -> dict[int, list[tuple[int, dict]]]:
    """Demo grafı okur ve Dijkstra için Adjacency List (dict) formatında döndürür."""
    if not GRAPH_FILE.exists():
        build_demo_graph()

    with open(GRAPH_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    adj_list = {}
    for node in data["nodes"]:
        adj_list[node["id"]] = []
        
    for link in data["links"]:
        u = link["source"]
        v = link["target"]
        attrs = {k: v for k, v in link.items() if k not in ("source", "target")}
        adj_list[u].append((v, attrs))
        
    return adj_list