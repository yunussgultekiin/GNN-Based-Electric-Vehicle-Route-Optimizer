from app.services.routing.dijkstra import find_min_energy_path

def get_charging_nodes(nodes_data: dict[int, dict]) -> list[int]:
    """Nodes data içerisinden type'ı 'charging' olanların ID'lerini döndürür."""
    return [node_id for node_id, data in nodes_data.items() if data.get('type') == 'charging']

def inject_charging_stops(adjacency_list: dict, source: int, target: int, edge_weights: dict, initial_path: list[int], initial_energy: float, battery_range_wh: float, nodes_data: dict) -> tuple[list[int], float, list[int], list[str]]:
    """
    Eğer toplam enerji araç bataryasını aşıyorsa en uygun şarj istasyonunu bulur ve rotaya ekler.
    """
    warnings = []
    
    # Batarya yeterliyse mevcut rotayı olduğu gibi dön
    if initial_energy <= battery_range_wh:
        return initial_path, initial_energy, [], warnings

    charging_nodes = get_charging_nodes(nodes_data)
    if not charging_nodes:
        warnings.append("Batarya yetersiz ve çevrede şarj istasyonu bulunamadı.")
        return [], 0.0, [], warnings

    best_path = []
    best_energy = float('inf')
    best_station = None

    # En uygun istasyonu bulmak için her istasyonu test et (A -> Station -> B)
    for station in charging_nodes:
        if station == source or station == target:
            continue
            
        # 1. Aşama: Kaynaktan istasyona
        path1, energy1 = find_min_energy_path(adjacency_list, source, station, edge_weights)
        
        # 2. Aşama: İstasyondan hedefe
        path2, energy2 = find_min_energy_path(adjacency_list, station, target, edge_weights)
        
        if path1 and path2:
            # İstasyonlara ulaşım için batarya yetiyor mu kontrol et
            if energy1 <= battery_range_wh and energy2 <= battery_range_wh:
                total_route_energy = energy1 + energy2
                if total_route_energy < best_energy:
                    best_energy = total_route_energy
                    # İki rotayı birleştirirken 'station' noktasının tekrarlanmasını engelle
                    best_path = path1[:-1] + path2 
                    best_station = station

    if not best_path:
        warnings.append("Batarya yetersiz. Hiçbir şarj istasyonuna güvenli menzilde ulaşılamıyor.")
        return [], 0.0, [], warnings

    return best_path, best_energy, [best_station], warnings