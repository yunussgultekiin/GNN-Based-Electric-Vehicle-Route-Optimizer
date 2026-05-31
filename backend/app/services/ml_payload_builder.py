from __future__ import annotations

_ACCELERATION_BY_SURFACE: dict[int, float] = {
    1: 0.0,
    2: 0.5,
    3: 1.0,
}
_DEFAULT_ACCELERATION = 0.2

def build_edge_features(
    edges: list[dict],
    dynamic_conditions: dict,
    edge_traffic: dict,
    battery_soc: float = 80.0,
) -> list[dict]:
    result: list[dict] = []
    for edge in edges:
        edge_id = edge.get("id")
        surface = edge.get("surface_type", 1)
        acceleration = _ACCELERATION_BY_SURFACE.get(surface, _DEFAULT_ACCELERATION)
        traffic_density = edge_traffic.get(edge_id, 1)

        result.append({
            "length": edge["length"],
            "gradient": edge["gradient"],
            "temperature": dynamic_conditions["temperature"],
            "wind_speed": dynamic_conditions["wind_speed"],
            "speed_kmh": edge["speed_kmh"],
            "battery_soc": battery_soc,
            "acceleration": acceleration,
            "surface_type": surface,
            "traffic_density": traffic_density,
            "weather_condition": dynamic_conditions["weather_condition"],
        })
    return result
