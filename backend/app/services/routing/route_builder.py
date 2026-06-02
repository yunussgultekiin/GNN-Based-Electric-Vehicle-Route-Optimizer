import logging

_logger = logging.getLogger(__name__)

def _find_edge_attrs(adjacency_list: dict, source: int, target: int) -> dict:
    for neighbor, attrs in adjacency_list.get(source, []):
        if neighbor == target:
            return attrs
    return {}

def _append_geometry(coordinates: list[list[float]], geometry: list[list[float]]) -> None:
    for point in geometry:
        if not coordinates or coordinates[-1] != point:
            coordinates.append(point)

def build_route_response(
    path: list[int],
    adjacency_list: dict,
    energy_weights: dict,
    nodes_data: dict,
    charging_stops: list[int],
    warnings: list[dict] | None = None,
) -> dict:
    if warnings is None:
        warnings = []

    if not path:
        return {
            "coordinates": [],
            "route_edge_ids": [],
            "edge_energy_labels": [],
            "total_energy_wh": 0.0,
            "distance_m": 0.0,
            "charging_stops": [],
            "avg_traffic_density": 0.0,
            "warnings": warnings if warnings else [{"code": "NO_VALID_ROUTE"}],
        }

    coordinates: list[list[float]] = []
    route_edge_ids: list[str] = []
    edge_energy_labels: list[dict] = []
    total_energy_wh = 0.0
    total_distance_km = 0.0
    traffic_sum = 0.0
    edge_count = 0

    for i in range(len(path) - 1):
        source = path[i]
        target = path[i + 1]
        edge_attrs = _find_edge_attrs(adjacency_list, source, target)

        edge_id = f"{source}_{target}"
        length_km = float(edge_attrs.get("length", 0.0))
        energy_wh = energy_weights.get((source, target), float("inf"))
        if energy_wh == float("inf"):
            _logger.warning("edge (%s, %s) missing from energy_weights; skipping energy", source, target)
            energy_wh = 0.0
        energy_wh = float(energy_wh)
        traffic_density = float(edge_attrs.get("traffic_density", 1.0))
        geometry = edge_attrs.get("geometry", [])

        route_edge_ids.append(edge_id)
        total_energy_wh += energy_wh
        total_distance_km += length_km
        traffic_sum += traffic_density
        edge_count += 1

        if geometry:
            _append_geometry(coordinates, geometry)
        else:
            source_node = nodes_data.get(source, {})
            target_node = nodes_data.get(target, {})
            source_lat = source_node.get("lat") or source_node.get("y")
            source_lon = source_node.get("lon") or source_node.get("x")
            target_lat = target_node.get("lat") or target_node.get("y")
            target_lon = target_node.get("lon") or target_node.get("x")

            if source_lat is not None and source_lon is not None:
                _append_geometry(coordinates, [[source_lat, source_lon]])
            if target_lat is not None and target_lon is not None:
                _append_geometry(coordinates, [[target_lat, target_lon]])

        edge_energy_labels.append({
            "edge_id": edge_id,
            "length_km": round(length_km, 4),
            "energy_kwh": round(energy_wh / 1000.0, 4),
        })

    avg_traffic_density = 0.0
    if edge_count > 0:
        avg_traffic_density = (traffic_sum / edge_count) / 3.0

    return {
        "coordinates": coordinates,
        "route_edge_ids": route_edge_ids,
        "edge_energy_labels": edge_energy_labels,
        "total_energy_wh": round(total_energy_wh, 2),
        "distance_m": round(total_distance_km * 1000.0, 2),
        "charging_stops": charging_stops,
        "avg_traffic_density": round(avg_traffic_density, 4),
        "warnings": warnings,
    }