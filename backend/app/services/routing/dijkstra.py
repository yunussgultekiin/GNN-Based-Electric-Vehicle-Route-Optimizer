import heapq

def find_min_energy_path(adjacency_list: dict[int, list[tuple[int, dict]]], source: int, target: int, edge_weights: dict[tuple[int, int], float]) -> tuple[list[int], float]:
    """
    Min-heap priority queue kullanarak verilen ağırlıklara (enerji veya mesafe) göre
    minimum maliyetli rotayı bulur.
    """
    if source not in adjacency_list or target not in adjacency_list:
        return [], float('inf')

    # Priority queue (maliyet, node_id) tutar
    queue = [(0.0, source)]
    
    # Başlangıçta tüm mesafeler sonsuz
    distances = {node: float('inf') for node in adjacency_list}
    distances[source] = 0.0
    
    # Rotayı geri izleyebilmek için parent dizisi
    previous_nodes = {node: None for node in adjacency_list}

    while queue:
        current_distance, current_node = heapq.heappop(queue)

        # Hedefe ulaştıysak döngüden çık
        if current_node == target:
            break

        # Daha önceden daha kısa bir yol bulunduysa bu yolu atla
        if current_distance > distances[current_node]:
            continue

        for neighbor, _ in adjacency_list[current_node]:
            # edge_weights dict'i (u, v) tuple'ı üzerinden maliyeti döndürür
            weight = edge_weights.get((current_node, neighbor), float('inf'))
            new_distance = current_distance + weight

            if new_distance < distances[neighbor]:
                distances[neighbor] = new_distance
                previous_nodes[neighbor] = current_node
                heapq.heappush(queue, (new_distance, neighbor))

    if distances[target] == float('inf'):
        return [], float('inf')

    # Hedef noktasından geriye doğru rotayı oluştur
    path = []
    current = target
    while current is not None:
        path.append(current)
        current = previous_nodes[current]
        
    path.reverse()
    return path, distances[target]

def build_energy_weights(adjacency_list: dict[int, list[tuple[int, dict]]], scores: dict[tuple[int, int], float]) -> dict[tuple[int, int], float]:
    """
    ML servisinden gelen enerji skorlarını routing algoritması için (u, v) -> weight formatına çevirir.
    Routing mantığını ML katmanından soyutlar.
    """
    weights = {}
    for u, neighbors in adjacency_list.items():
        for v, _ in neighbors:
            # Score yoksa sonsuz kabul et, rotaya dahil edilmesin
            weights[(u, v)] = scores.get((u, v), float('inf'))
    return weights

def build_distance_weights(adjacency_list: dict[int, list[tuple[int, dict]]]) -> dict[tuple[int, int], float]:
    """
    Geleneksel yönlendirme için kenar ağırlığı olarak uzunluğu (km) döner.
    """
    weights = {}
    for u, neighbors in adjacency_list.items():
        for v, attrs in neighbors:
            weights[(u, v)] = attrs.get('length', float('inf'))
    return weights