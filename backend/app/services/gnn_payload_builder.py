from __future__ import annotations

_ACCELERATION_BY_SURFACE: dict[int, float] = {
    1: 0.0,
    2: 0.5,
    3: 1.0,
}
_DEFAULT_ACCELERATION = 0.2

def _normalize_edge(edge) -> dict:
    if isinstance(edge, dict):
        return edge

    if isinstance(edge, tuple) and len(edge) == 3:
        u, v, attrs = edge
        normalized = dict(attrs)
        normalized["id"] = normalized.get("id", f"{u}_{v}")
        normalized["source"] = u
        normalized["target"] = v
        return normalized

    raise TypeError("Edge must be a dict or a tuple in the form (u, v, attrs).")

def build_edge_features(
    edges: list,
    dynamic_conditions: dict,
    edge_traffic: dict,
    battery_soc: float = 80.0,
) -> list[dict]:
    result: list[dict] = []

    for raw_edge in edges:
        edge = _normalize_edge(raw_edge)
        edge_id = edge.get("id")
        surface = int(edge.get("surface_type", 1))
        acceleration = _ACCELERATION_BY_SURFACE.get(surface, _DEFAULT_ACCELERATION)
        traffic_density = edge_traffic.get(edge_id, 1)

        edge["traffic_density"] = traffic_density

        result.append({
            "length": float(edge["length"]),
            "gradient": float(edge.get("gradient", 0.0)),
            "temperature": float(dynamic_conditions["temperature"]),
            "wind_speed": float(dynamic_conditions["wind_speed"]),
            "speed_kmh": float(edge.get("speed_kmh", 30.0)),
            "battery_soc": float(battery_soc),
            "acceleration": float(acceleration),
            "surface_type": surface,
            "traffic_density": float(traffic_density),
            "weather_condition": int(dynamic_conditions["weather_condition"]),
        })

    return result
