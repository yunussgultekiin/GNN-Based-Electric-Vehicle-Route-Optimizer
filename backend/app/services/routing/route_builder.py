def build_route_response(path: list[int], adjacency_list: dict, edge_weights: dict, nodes_data: dict, charging_stops: list[int], warnings: list[str] = None):
    """
    Bulunan optimal düğüm (node) listesini API'nin döneceği zengin JSON formatına (polyline, metrikler) dönüştürür.
    """
    if warnings is None:
        warnings = []
        
    if not path:
        return {
            "polyline": [],
            "total_energy_wh": 0.0,
            "distance_m": 0.0,
            "charging_stops": [],
            "avg_traffic_density": 0.0,
            "warnings": warnings if warnings else ["Geçerli bir rota bulunamadı."]
        }

    polyline = []
    total_energy_wh = 0.0
    total_distance_km = 0.0
    traffic_sum = 0
    edge_count = 0

    # Node'ların koordinatlarını polyline formatında ([lat, lon]) diz
    for node in path:
        node_info = nodes_data.get(node, {})
        lat, lon = node_info.get("lat"), node_info.get("lon")
        # Eğer OSMnx node'u ise lat/lon yerine y/x olabilir, burayı node yapınıza göre düzenleyebilirsiniz.
        # Fallback olarak y ve x de ekleyelim
        if lat is None: lat = node_info.get("y")
        if lon is None: lon = node_info.get("x")
            
        if lat is not None and lon is not None:
            polyline.append([lat, lon])

    # Edge bazlı metrikleri hesapla (enerji, mesafe, trafik)
    for i in range(len(path) - 1):
        u = path[i]
        v = path[i+1]
        
        edge_attrs = {}
        # u'dan v'ye giden edge'in özelliklerini bul
        for neighbor, attrs in adjacency_list.get(u, []):
            if neighbor == v:
                edge_attrs = attrs
                break
                
        total_energy_wh += edge_weights.get((u, v), 0.0)
        total_distance_km += edge_attrs.get("length", 0.0)
        
        # Traffic density (1, 2, 3) varsayılıyor. Veri yoksa 1 kabul et.
        traffic = edge_attrs.get("traffic_density", 1)
        traffic_sum += traffic
        edge_count += 1

    # Trafik yoğunluğunu [0.0 - 1.0] arasına normalize et (maks değer 3 kabul edilerek)
    avg_traffic_density = 0.0
    if edge_count > 0:
        avg_traffic_density = (traffic_sum / edge_count) / 3.0

    return {
        "polyline": polyline,
        "total_energy_wh": round(total_energy_wh, 2),
        "distance_m": round(total_distance_km * 1000.0, 2),  # km -> m
        "charging_stops": charging_stops,
        "avg_traffic_density": round(avg_traffic_density, 4),
        "warnings": warnings
    }