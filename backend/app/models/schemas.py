from pydantic import BaseModel, Field, model_validator
from typing import Literal

class RouteRequest(BaseModel):
    origin_node_id: int
    dest_node_id: int
    battery_range_wh: float
    battery_soc: float = Field(default=80.0, ge=0.0, le=100.0)

    @model_validator(mode="after")
    def verify_different_nodes(self) -> "RouteRequest":
        if self.origin_node_id == self.dest_node_id:
            raise ValueError("ORIGIN_EQUALS_DESTINATION")
        return self

class ChargingStop(BaseModel):
    node_id: int
    lat: float
    lon: float
    name: str

class GlobalConditions(BaseModel):
    temperature: float
    wind_speed: float
    weather_condition: int = Field(
        description="1=sunny, 2=cloudy, 3=rainy, 4=snowy"
    )

class DemoNode(BaseModel):
    id: int
    osm_node_id: int | None = None
    lat: float
    lon: float
    name: str
    type: Literal["normal", "charging"]

class DemoEdge(BaseModel):
    source: int
    target: int
    length_km: float
    geometry: list[list[float]]

class DemoGraphResponse(BaseModel):
    nodes: list[DemoNode]
    edges: list[DemoEdge]

class EdgeEnergyLabel(BaseModel):
    edge_id: str
    length_km: float
    energy_kwh: float

class RouteResponse(BaseModel):
    coordinates: list[list[float]]
    route_edge_ids: list[str]
    edge_energy_labels: list[EdgeEnergyLabel]
    total_energy_wh: float
    distance_m: float
    charging_stops: list[ChargingStop]
    avg_traffic_density: float
    global_conditions: GlobalConditions
    warnings: list[dict]