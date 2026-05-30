import type {
    Coordinate,
    DemoGraph,
    RouteRequest,
    RouteResponse,
  } from "@/types/route";
  
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  
  const maltepeCoordinates: Coordinate[] = [
    { lat: 40.9369, lon: 29.1556 },
    { lat: 40.9358, lon: 29.1582 },
    { lat: 40.9346, lon: 29.1611 },
    { lat: 40.9334, lon: 29.1644 },
    { lat: 40.9321, lon: 29.1675 },
    { lat: 40.9309, lon: 29.1703 },
    { lat: 40.9296, lon: 29.1731 },
    { lat: 40.9284, lon: 29.1760 },
    { lat: 40.9273, lon: 29.1791 },
    { lat: 40.9261, lon: 29.1822 },
    { lat: 40.9248, lon: 29.1850 },
    { lat: 40.9236, lon: 29.1881 },
    { lat: 40.9317, lon: 29.1595 },
    { lat: 40.9289, lon: 29.1688 },
    { lat: 40.9254, lon: 29.1804 },
  ];
  
  export async function fetchDemoGraph(): Promise<DemoGraph> {
    await delay(300);
  
    return {
      nodes: [
        { id: "n1", label: "Maltepe Sahil", type: "normal", coordinate: maltepeCoordinates[0] },
        { id: "n2", label: "Sahil Parkı", type: "normal", coordinate: maltepeCoordinates[1] },
        { id: "n3", label: "İdealtepe", type: "normal", coordinate: maltepeCoordinates[2] },
        { id: "n4", label: "Küçükyalı", type: "normal", coordinate: maltepeCoordinates[3] },
        { id: "n5", label: "Altayçeşme", type: "normal", coordinate: maltepeCoordinates[4] },
        { id: "n6", label: "Bağlarbaşı", type: "normal", coordinate: maltepeCoordinates[5] },
        { id: "n7", label: "Feyzullah", type: "normal", coordinate: maltepeCoordinates[6] },
        { id: "n8", label: "Cevizli", type: "normal", coordinate: maltepeCoordinates[7] },
        { id: "n9", label: "Dragos", type: "normal", coordinate: maltepeCoordinates[8] },
        { id: "n10", label: "Orhantepe", type: "normal", coordinate: maltepeCoordinates[9] },
        { id: "n11", label: "Kartal Sahil", type: "normal", coordinate: maltepeCoordinates[10] },
        { id: "n12", label: "Kartal Merkez", type: "normal", coordinate: maltepeCoordinates[11] },
        { id: "c1", label: "Charging Station A", type: "charging", coordinate: maltepeCoordinates[12] },
        { id: "c2", label: "Charging Station B", type: "charging", coordinate: maltepeCoordinates[13] },
        { id: "c3", label: "Charging Station C", type: "charging", coordinate: maltepeCoordinates[14] },
      ],
      edges: [
        {
          id: "e1",
          from_node_id: "n1",
          to_node_id: "n2",
          distance_m: 420,
          geometry: [maltepeCoordinates[0], maltepeCoordinates[1]],
        },
        {
          id: "e2",
          from_node_id: "n2",
          to_node_id: "n3",
          distance_m: 510,
          geometry: [maltepeCoordinates[1], maltepeCoordinates[2]],
        },
        {
          id: "e3",
          from_node_id: "n3",
          to_node_id: "n4",
          distance_m: 560,
          geometry: [maltepeCoordinates[2], maltepeCoordinates[3]],
        },
        {
          id: "e4",
          from_node_id: "n4",
          to_node_id: "n5",
          distance_m: 600,
          geometry: [maltepeCoordinates[3], maltepeCoordinates[4]],
        },
        {
          id: "e5",
          from_node_id: "n5",
          to_node_id: "n6",
          distance_m: 480,
          geometry: [maltepeCoordinates[4], maltepeCoordinates[5]],
        },
        {
          id: "e6",
          from_node_id: "n6",
          to_node_id: "n7",
          distance_m: 530,
          geometry: [maltepeCoordinates[5], maltepeCoordinates[6]],
        },
        {
          id: "e7",
          from_node_id: "n7",
          to_node_id: "n8",
          distance_m: 470,
          geometry: [maltepeCoordinates[6], maltepeCoordinates[7]],
        },
        {
          id: "e8",
          from_node_id: "n8",
          to_node_id: "n9",
          distance_m: 520,
          geometry: [maltepeCoordinates[7], maltepeCoordinates[8]],
        },
        {
          id: "e9",
          from_node_id: "n9",
          to_node_id: "n10",
          distance_m: 590,
          geometry: [maltepeCoordinates[8], maltepeCoordinates[9]],
        },
        {
          id: "e10",
          from_node_id: "n10",
          to_node_id: "n11",
          distance_m: 610,
          geometry: [maltepeCoordinates[9], maltepeCoordinates[10]],
        },
        {
          id: "e11",
          from_node_id: "n11",
          to_node_id: "n12",
          distance_m: 550,
          geometry: [maltepeCoordinates[10], maltepeCoordinates[11]],
        },
        {
          id: "e12",
          from_node_id: "n3",
          to_node_id: "c1",
          distance_m: 380,
          geometry: [maltepeCoordinates[2], maltepeCoordinates[12]],
        },
        {
          id: "e13",
          from_node_id: "n6",
          to_node_id: "c2",
          distance_m: 410,
          geometry: [maltepeCoordinates[5], maltepeCoordinates[13]],
        },
        {
          id: "e14",
          from_node_id: "n10",
          to_node_id: "c3",
          distance_m: 390,
          geometry: [maltepeCoordinates[9], maltepeCoordinates[14]],
        },
      ],
    };
  }
  
  export async function fetchOptimalRoute(
    request: RouteRequest
  ): Promise<RouteResponse> {
    await delay(300);
  
    return {
      route_id: "mock-optimal-route",
      coordinates: [
        request.origin,
        maltepeCoordinates[1],
        maltepeCoordinates[2],
        maltepeCoordinates[12],
        maltepeCoordinates[5],
        maltepeCoordinates[13],
        maltepeCoordinates[8],
        request.destination,
      ],
      total_distance_m: 5200,
      total_energy_wh: 6900,
      estimated_duration_min: 18,
      avg_traffic_density: 0.28,
      charging_stops: [
        {
          id: "c1",
          name: "Charging Station A",
          coordinate: maltepeCoordinates[12],
          estimated_charging_time_min: 16,
          connector_type: "CCS",
        },
        {
          id: "c2",
          name: "Charging Station B",
          coordinate: maltepeCoordinates[13],
          estimated_charging_time_min: 12,
          connector_type: "Type 2",
        },
      ],
      edge_energy_labels: [
        {
          edge_id: "e1",
          from_node_id: "n1",
          to_node_id: "n2",
          energy_wh: 720,
          traffic_density: 0.22,
          gradient_percent: 1.1,
        },
        {
          edge_id: "e2",
          from_node_id: "n2",
          to_node_id: "n3",
          energy_wh: 810,
          traffic_density: 0.25,
          gradient_percent: 1.5,
        },
        {
          edge_id: "e12",
          from_node_id: "n3",
          to_node_id: "c1",
          energy_wh: 640,
          traffic_density: 0.2,
          gradient_percent: 0.8,
        },
        {
          edge_id: "e13",
          from_node_id: "n6",
          to_node_id: "c2",
          energy_wh: 700,
          traffic_density: 0.31,
          gradient_percent: 1.2,
        },
      ],
      warnings: [],
    };
  }
  
  export async function fetchDirectRoute(
    request: RouteRequest
  ): Promise<RouteResponse> {
    await delay(300);
  
    return {
      route_id: "mock-direct-route",
      coordinates: [
        request.origin,
        maltepeCoordinates[2],
        maltepeCoordinates[4],
        maltepeCoordinates[6],
        maltepeCoordinates[8],
        maltepeCoordinates[10],
        request.destination,
      ],
      total_distance_m: 4800,
      total_energy_wh: 9800,
      estimated_duration_min: 15,
      avg_traffic_density: 0.76,
      charging_stops: [],
      edge_energy_labels: [],
      warnings: [],
    };
  }