export type Coordinate = {
    lat: number;
    lon: number;
  };
  
  export type GlobalConditions = {
    traffic_density: number;
    ambient_temperature_c: number;
    wind_speed_kmh: number;
    weather_condition: "clear" | "rain" | "snow" | "fog" | "cloudy";
  };
  
  export type ChargingStop = {
    id: string;
    name: string;
    coordinate: Coordinate;
    estimated_charging_time_min: number;
    connector_type?: string;
  };
  
  export type EdgeEnergyLabel = {
    edge_id: string;
    from_node_id: string;
    to_node_id: string;
    energy_wh: number;
    traffic_density: number;
    gradient_percent?: number;
  };
  
  export type RouteRequest = {
    origin: Coordinate;
    destination: Coordinate;
    battery_capacity_wh: number;
    current_battery_wh: number;
    vehicle_model?: string;
    global_conditions?: GlobalConditions;
  };
  
  export type RouteResponse = {
    route_id: string;
    coordinates: Coordinate[];
    total_distance_m: number;
    total_energy_wh: number;
    estimated_duration_min: number;
    avg_traffic_density: number;
    charging_stops: ChargingStop[];
    edge_energy_labels: EdgeEnergyLabel[];
    warnings: string[];
  };
  
  export type DemoNode = {
    id: string;
    label: string;
    type: "normal" | "charging";
    coordinate: Coordinate;
  };
  
  export type DemoEdge = {
    id: string;
    from_node_id: string;
    to_node_id: string;
    distance_m: number;
    geometry: Coordinate[];
  };
  
  export type DemoGraph = {
    nodes: DemoNode[];
    edges: DemoEdge[];
  };