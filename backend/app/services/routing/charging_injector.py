import math
from app.services.routing.dijkstra import find_min_energy_path

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def get_charging_nodes(nodes_data: dict[int, dict]) -> list[int]:
    return [node_id for node_id, data in nodes_data.items() if data.get("type") == "charging"]

def find_nearest_charging_node(
    src_lat: float,
    src_lon: float,
    charging_nodes: list[int],
    nodes_data: dict,
) -> int:
    return min(
        charging_nodes,
        key=lambda s: haversine_distance(
            src_lat, src_lon,
            float(nodes_data[s].get("lat", 0)),
            float(nodes_data[s].get("lon", 0)),
        ),
    )

def _path_length_km(path: list[int], adjacency_list: dict) -> float:
    total = 0.0
    for i in range(len(path) - 1):
        for neighbor, attrs in adjacency_list.get(path[i], []):
            if neighbor == path[i + 1]:
                total += float(attrs.get("length", 0.0))
                break
    return total

def build_nearest_charging_warning(
    src_lat: float,
    src_lon: float,
    charging_nodes: list[int],
    nodes_data: dict,
    source: int | None = None,
    adjacency_list: dict | None = None,
    routing_weights: dict | None = None,
) -> dict:
    nearest = find_nearest_charging_node(src_lat, src_lon, charging_nodes, nodes_data)
    nearest_data = nodes_data.get(nearest, {})
    nearest_name = nearest_data.get("name", str(nearest))

    dist_m = None
    if source is not None and adjacency_list is not None and routing_weights is not None:
        path, _ = find_min_energy_path(adjacency_list, source, nearest, routing_weights)
        if path:
            dist_m = _path_length_km(path, adjacency_list) * 1000

    if dist_m is None:
        dist_m = haversine_distance(
            src_lat, src_lon,
            float(nearest_data.get("lat", 0)),
            float(nearest_data.get("lon", 0)),
        ) * 1000

    return {
        "code": "BATTERY_INSUFFICIENT_NEAREST_STATION",
        "params": {"name": nearest_name, "distance_m": round(dist_m)},
    }

def _path_display_wh(path: list[int], display_energy_wh: dict[tuple[int, int], float]) -> float:
    return sum(
        display_energy_wh.get((path[i], path[i + 1]), float("inf"))
        for i in range(len(path) - 1)
    )

def inject_charging_stops(
    adjacency_list: dict,
    source: int,
    target: int,
    energy_wh: dict,
    initial_path: list[int],
    initial_energy_wh: float,
    battery_range_wh: float,
    nodes_data: dict,
) -> tuple[list[int], float, list[int], list[dict]]:
    warnings = []

    if initial_energy_wh <= battery_range_wh:
        return initial_path, initial_energy_wh, [], warnings

    charging_nodes = get_charging_nodes(nodes_data)
    if not charging_nodes:
        warnings.append({"code": "BATTERY_INSUFFICIENT_NO_STATION"})
        return [], 0.0, [], warnings

    source_data = nodes_data.get(source, {})
    src_lat = float(source_data.get("lat", 0))
    src_lon = float(source_data.get("lon", 0))

    candidates = sorted(
        [s for s in charging_nodes if s != source and s != target],
        key=lambda s: haversine_distance(
            src_lat,
            src_lon,
            float(nodes_data[s].get("lat", 0)),
            float(nodes_data[s].get("lon", 0)),
        ),
    )[:2]

    best_path: list[int] = []
    best_energy = float("inf")
    best_station = None
    nearest_leg1: list[int] = []

    for station in candidates:
        path1, _ = find_min_energy_path(adjacency_list, source, station, energy_wh)
        path2, _ = find_min_energy_path(adjacency_list, station, target, energy_wh)

        if path1 and not nearest_leg1:
            nearest_leg1 = path1

        if path1 and path2:
            energy1 = _path_display_wh(path1, energy_wh)
            energy2 = _path_display_wh(path2, energy_wh)

            if energy1 <= battery_range_wh and energy2 <= battery_range_wh:
                total_route_energy = energy1 + energy2
                if total_route_energy < best_energy:
                    best_energy = total_route_energy
                    best_path = path1[:-1] + path2
                    best_station = station

    if not best_path:
        warning = build_nearest_charging_warning(
            src_lat, src_lon, charging_nodes, nodes_data,
            source=source,
            adjacency_list=adjacency_list,
            routing_weights=energy_wh,
        )
        if nearest_leg1:
            warning["params"]["distance_m"] = round(_path_length_km(nearest_leg1, adjacency_list) * 1000)
        warnings.append(warning)
        return [], 0.0, [], warnings

    return best_path, best_energy, [best_station], warnings
