export type GlobalConditions = {
  temperature: number;
  wind_speed: number;
  weather_condition: number;
};

export type ChargingStop = {
  node_id: number;
  lat: number;
  lon: number;
  name: string;
};

export type EdgeEnergyLabel = {
  edge_id: string;
  length_km: number;
  energy_kwh: number;
};

export type RouteRequest = {
  origin_node_id: number;
  dest_node_id: number;
  battery_range_wh: number;
  battery_soc?: number;
};

export type RouteWarning = {
  code: string;
  params?: Record<string, unknown>;
};

export type RouteResponse = {
  coordinates: number[][];
  route_edge_ids?: string[];
  edge_energy_labels: EdgeEnergyLabel[];
  total_energy_wh: number;
  distance_m: number;
  charging_stops: ChargingStop[];
  avg_traffic_density: number;
  global_conditions: GlobalConditions;
  warnings: RouteWarning[];
};

export type DemoNode = {
  id: number;
  lat: number;
  lon: number;
  name: string;
  type: "normal" | "charging";
};

export type DemoEdge = {
  source: number;
  target: number;
  length_km: number;
  geometry: number[][];
};

export type DemoGraph = {
  nodes: DemoNode[];
  edges: DemoEdge[];
};
