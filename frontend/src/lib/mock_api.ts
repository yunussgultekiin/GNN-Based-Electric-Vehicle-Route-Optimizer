import type {
  DemoEdge,
  DemoGraph,
  RouteRequest,
  RouteResponse,
} from "@/types/route";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const NODES = [
  { id: 1,  lat: 40.9488, lon: 29.1226, name: "Küçükyalı Metro",                          type: "normal"   as const },
  { id: 2,  lat: 40.9298, lon: 29.1461, name: "Huzurevi Metro",                            type: "normal"   as const },
  { id: 3,  lat: 40.9359, lon: 29.1392, name: "Maltepe Metro",                             type: "normal"   as const },
  { id: 4,  lat: 40.9236, lon: 29.1551, name: "Gülsuyu Metro",                             type: "normal"   as const },
  { id: 5,  lat: 40.9207, lon: 29.1662, name: "Esenkent Metro",                            type: "normal"   as const },
  { id: 6,  lat: 40.9151, lon: 29.1815, name: "Hastane-Adliye Metro",                      type: "normal"   as const },
  { id: 7,  lat: 40.9127, lon: 29.1920, name: "Soğanlık Metro",                            type: "normal"   as const },
  { id: 8,  lat: 40.9061, lon: 29.2111, name: "Kartal Metro",                              type: "normal"   as const },
  { id: 9,  lat: 40.9517, lon: 29.1385, name: "Marmara Üni. Başıbüyük",                   type: "normal"   as const },
  { id: 10, lat: 40.9586, lon: 29.1858, name: "Maltepe Üniversitesi",                      type: "normal"   as const },
  { id: 11, lat: 40.9204, lon: 29.1352, name: "Maltepe Marmaray",                          type: "normal"   as const },
  { id: 12, lat: 40.9360, lon: 29.1530, name: "Maltepe Sahil",                             type: "normal"   as const },
  { id: 13, lat: 40.9480, lon: 29.1350, name: "Bağdat Cad. Batı",                          type: "normal"   as const },
  { id: 14, lat: 40.9455, lon: 29.1520, name: "Bağdat Cad. Orta",                          type: "normal"   as const },
  { id: 15, lat: 40.9430, lon: 29.1680, name: "Bağdat Cad. Doğu",                          type: "normal"   as const },
  { id: 16, lat: 40.9510, lon: 29.1240, name: "Küçükyalı Sahil",                           type: "normal"   as const },
  { id: 17, lat: 40.9385, lon: 29.1580, name: "Maltepe İskelesi",                          type: "normal"   as const },
  { id: 18, lat: 40.9460, lon: 29.1390, name: "Atatürk Cad. Kuzey",                        type: "normal"   as const },
  { id: 19, lat: 40.9380, lon: 29.1410, name: "Atatürk Cad. Güney",                        type: "normal"   as const },
  { id: 20, lat: 40.9450, lon: 29.1500, name: "Girne Cad. Kuzey",                          type: "normal"   as const },
  { id: 21, lat: 40.9340, lon: 29.1480, name: "Girne Cad. Güney",                          type: "normal"   as const },
  { id: 22, lat: 40.9410, lon: 29.1610, name: "Feyzullah Cad. Kuzey",                      type: "normal"   as const },
  { id: 23, lat: 40.9295, lon: 29.1640, name: "Feyzullah Cad. Güney",                      type: "normal"   as const },
  { id: 24, lat: 40.9308, lon: 29.1700, name: "Bağlarbaşı Kavşağı",                        type: "normal"   as const },
  { id: 25, lat: 40.9250, lon: 29.1760, name: "Cevizli Kavşağı",                           type: "normal"   as const },
  { id: 26, lat: 40.9220, lon: 29.1790, name: "Dragos Tepesi",                             type: "normal"   as const },
  { id: 27, lat: 40.9261, lon: 29.1822, name: "Orhantepe",                                 type: "normal"   as const },
  { id: 28, lat: 40.9248, lon: 29.1850, name: "Kartal Sahil",                              type: "normal"   as const },
  { id: 29, lat: 40.9230, lon: 29.1870, name: "Uğur Mumcu Cad.",                           type: "normal"   as const },
  { id: 30, lat: 40.9200, lon: 29.1920, name: "Kartal Merkez",                             type: "normal"   as const },
  { id: 31, lat: 40.9346, lon: 29.1611, name: "İdealtepe",                                 type: "normal"   as const },
  { id: 32, lat: 40.9390, lon: 29.1650, name: "Çınar Mah.",                                type: "normal"   as const },
  { id: 33, lat: 40.9330, lon: 29.1510, name: "Altayçeşme",                                type: "normal"   as const },
  { id: 34, lat: 40.9450, lon: 29.1440, name: "Başıbüyük Kavşağı",                         type: "normal"   as const },
  { id: 35, lat: 40.9490, lon: 29.1208, name: "Şarj İstasyonu — Küçükyalı Metro",          type: "charging" as const },
  { id: 36, lat: 40.9357, lon: 29.1374, name: "Şarj İstasyonu — Maltepe Metro",            type: "charging" as const },
  { id: 37, lat: 40.9306, lon: 29.1682, name: "Şarj İstasyonu — Bağlarbaşı",               type: "charging" as const },
  { id: 38, lat: 40.9205, lon: 29.1644, name: "Şarj İstasyonu — Esenkent",                 type: "charging" as const },
  { id: 39, lat: 40.9218, lon: 29.1772, name: "Şarj İstasyonu — Dragos",                   type: "charging" as const },
  { id: 40, lat: 40.9059, lon: 29.2093, name: "Şarj İstasyonu — Kartal Metro",             type: "charging" as const },
];

const BASE_EDGES: DemoEdge[] = [
      { source: 1,  target: 3,  length_km: 1.50, geometry: [[40.9488, 29.1226], [40.9445, 29.1280], [40.9402, 29.1338], [40.9359, 29.1392]] },
      { source: 3,  target: 2,  length_km: 0.89, geometry: [[40.9359, 29.1392], [40.9338, 29.1414], [40.9317, 29.1439], [40.9298, 29.1461]] },
      { source: 2,  target: 4,  length_km: 1.02, geometry: [[40.9298, 29.1461], [40.9277, 29.1491], [40.9257, 29.1522], [40.9236, 29.1551]] },
      { source: 4,  target: 5,  length_km: 0.98, geometry: [[40.9236, 29.1551], [40.9226, 29.1588], [40.9216, 29.1625], [40.9207, 29.1662]] },
      { source: 5,  target: 6,  length_km: 1.43, geometry: [[40.9207, 29.1662], [40.9188, 29.1713], [40.9170, 29.1765], [40.9151, 29.1815]] },
      { source: 6,  target: 7,  length_km: 0.92, geometry: [[40.9151, 29.1815], [40.9143, 29.1850], [40.9134, 29.1886], [40.9127, 29.1920]] },
      { source: 7,  target: 8,  length_km: 1.50, geometry: [[40.9127, 29.1920], [40.9105, 29.1983], [40.9083, 29.2049], [40.9061, 29.2111]] },
      { source: 16, target: 13, length_km: 0.98, geometry: [[40.9510, 29.1240], [40.9500, 29.1277], [40.9490, 29.1314], [40.9480, 29.1350]] },
      { source: 13, target: 14, length_km: 1.46, geometry: [[40.9480, 29.1350], [40.9472, 29.1407], [40.9462, 29.1464], [40.9455, 29.1520]] },
      { source: 14, target: 15, length_km: 1.37, geometry: [[40.9455, 29.1520], [40.9447, 29.1573], [40.9438, 29.1628], [40.9430, 29.1680]] },
      { source: 15, target: 32, length_km: 0.51, geometry: [[40.9430, 29.1680], [40.9416, 29.1671], [40.9402, 29.1659], [40.9390, 29.1650]] },
      { source: 32, target: 22, length_km: 0.40, geometry: [[40.9390, 29.1650], [40.9396, 29.1638], [40.9403, 29.1623], [40.9410, 29.1610]] },
      { source: 1,  target: 9,  length_km: 1.38, geometry: [[40.9488, 29.1226], [40.9497, 29.1279], [40.9508, 29.1333], [40.9517, 29.1385]] },
      { source: 9,  target: 18, length_km: 0.64, geometry: [[40.9517, 29.1385], [40.9498, 29.1387], [40.9479, 29.1388], [40.9460, 29.1390]] },
      { source: 18, target: 13, length_km: 0.40, geometry: [[40.9460, 29.1390], [40.9466, 29.1378], [40.9473, 29.1363], [40.9480, 29.1350]] },
      { source: 16, target: 1,  length_km: 0.27, geometry: [[40.9510, 29.1240], [40.9503, 29.1235], [40.9495, 29.1230], [40.9488, 29.1226]] },
      { source: 18, target: 19, length_km: 0.91, geometry: [[40.9460, 29.1390], [40.9433, 29.1396], [40.9406, 29.1404], [40.9380, 29.1410]] },
      { source: 19, target: 3,  length_km: 0.28, geometry: [[40.9380, 29.1410], [40.9374, 29.1404], [40.9366, 29.1397], [40.9359, 29.1392]] },
      { source: 14, target: 20, length_km: 0.22, geometry: [[40.9455, 29.1520], [40.9454, 29.1513], [40.9451, 29.1507], [40.9450, 29.1500]] },
      { source: 20, target: 21, length_km: 1.24, geometry: [[40.9450, 29.1500], [40.9413, 29.1493], [40.9376, 29.1487], [40.9340, 29.1480]] },
      { source: 21, target: 33, length_km: 0.28, geometry: [[40.9340, 29.1480], [40.9337, 29.1490], [40.9333, 29.1501], [40.9330, 29.1510]] },
      { source: 15, target: 22, length_km: 0.63, geometry: [[40.9430, 29.1680], [40.9423, 29.1658], [40.9416, 29.1633], [40.9410, 29.1610]] },
      { source: 22, target: 31, length_km: 0.71, geometry: [[40.9410, 29.1610], [40.9389, 29.1609], [40.9367, 29.1610], [40.9346, 29.1611]] },
      { source: 31, target: 23, length_km: 0.62, geometry: [[40.9346, 29.1611], [40.9329, 29.1620], [40.9312, 29.1631], [40.9295, 29.1640]] },
      { source: 23, target: 24, length_km: 0.53, geometry: [[40.9295, 29.1640], [40.9299, 29.1660], [40.9304, 29.1681], [40.9308, 29.1700]] },
      { source: 34, target: 2,  length_km: 1.50, geometry: [[40.9450, 29.1440], [40.9400, 29.1447], [40.9349, 29.1454], [40.9298, 29.1461]] },
      { source: 10, target: 7,  length_km: 1.50, geometry: [[40.9586, 29.1858], [40.9433, 29.1879], [40.9280, 29.1899], [40.9127, 29.1920]] },
      { source: 10, target: 27, length_km: 1.50, geometry: [[40.9586, 29.1858], [40.9478, 29.1846], [40.9369, 29.1834], [40.9261, 29.1822]] },
      { source: 12, target: 17, length_km: 0.50, geometry: [[40.9360, 29.1530], [40.9368, 29.1546], [40.9377, 29.1564], [40.9385, 29.1580]] },
      { source: 17, target: 21, length_km: 0.98, geometry: [[40.9385, 29.1580], [40.9370, 29.1547], [40.9355, 29.1514], [40.9340, 29.1480]] },
      { source: 24, target: 37, length_km: 0.22, geometry: [[40.9308, 29.1700], [40.9308, 29.1694], [40.9307, 29.1688], [40.9306, 29.1682]] },
      { source: 6,  target: 25, length_km: 1.20, geometry: [[40.9151, 29.1815], [40.9183, 29.1798], [40.9217, 29.1778], [40.9250, 29.1760]] },
      { source: 7,  target: 29, length_km: 1.22, geometry: [[40.9127, 29.1920], [40.9161, 29.1904], [40.9196, 29.1886], [40.9230, 29.1870]] },
      { source: 7,  target: 30, length_km: 0.81, geometry: [[40.9127, 29.1920], [40.9151, 29.1916], [40.9176, 29.1918], [40.9200, 29.1920]] },
      { source: 27, target: 28, length_km: 0.28, geometry: [[40.9261, 29.1822], [40.9257, 29.1831], [40.9252, 29.1841], [40.9248, 29.1850]] },
      { source: 28, target: 29, length_km: 0.26, geometry: [[40.9248, 29.1850], [40.9244, 29.1857], [40.9237, 29.1864], [40.9230, 29.1870]] },
      { source: 29, target: 30, length_km: 0.54, geometry: [[40.9230, 29.1870], [40.9220, 29.1887], [40.9210, 29.1904], [40.9200, 29.1920]] },
      { source: 25, target: 26, length_km: 0.42, geometry: [[40.9250, 29.1760], [40.9240, 29.1770], [40.9230, 29.1780], [40.9220, 29.1790]] },
      { source: 35, target: 1,  length_km: 0.22, geometry: [[40.9490, 29.1208], [40.9490, 29.1214], [40.9489, 29.1220], [40.9488, 29.1226]] },
      { source: 35, target: 16, length_km: 0.35, geometry: [[40.9490, 29.1208], [40.9497, 29.1218], [40.9503, 29.1230], [40.9510, 29.1240]] },
      { source: 36, target: 3,  length_km: 0.22, geometry: [[40.9357, 29.1374], [40.9357, 29.1380], [40.9358, 29.1386], [40.9359, 29.1392]] },
      { source: 36, target: 19, length_km: 0.40, geometry: [[40.9357, 29.1374], [40.9364, 29.1387], [40.9372, 29.1399], [40.9380, 29.1410]] },
      { source: 37, target: 5,  length_km: 1.11, geometry: [[40.9306, 29.1682], [40.9273, 29.1676], [40.9240, 29.1669], [40.9207, 29.1662]] },
      { source: 38, target: 5,  length_km: 0.22, geometry: [[40.9205, 29.1644], [40.9205, 29.1650], [40.9206, 29.1656], [40.9207, 29.1662]] },
      { source: 38, target: 6,  length_km: 1.50, geometry: [[40.9205, 29.1644], [40.9187, 29.1701], [40.9169, 29.1758], [40.9151, 29.1815]] },
      { source: 39, target: 26, length_km: 0.22, geometry: [[40.9218, 29.1772], [40.9218, 29.1778], [40.9219, 29.1784], [40.9220, 29.1790]] },
      { source: 39, target: 27, length_km: 0.64, geometry: [[40.9218, 29.1772], [40.9232, 29.1789], [40.9247, 29.1806], [40.9261, 29.1822]] },
      { source: 40, target: 8,  length_km: 0.22, geometry: [[40.9059, 29.2093], [40.9059, 29.2099], [40.9060, 29.2105], [40.9061, 29.2111]] },
      { source: 40, target: 30, length_km: 1.50, geometry: [[40.9059, 29.2093], [40.9106, 29.2036], [40.9153, 29.1977], [40.9200, 29.1920]] },
{ source: 11, target: 23, length_km: 1.05, geometry: [[40.9204, 29.1352], [40.9233, 29.1432], [40.9262, 29.1536], [40.9295, 29.1640]] },
      { source: 11, target: 2,  length_km: 1.32, geometry: [[40.9204, 29.1352], [40.9235, 29.1388], [40.9267, 29.1424], [40.9298, 29.1461]] },
      { source: 3,  target: 36, length_km: 0.22, geometry: [[40.9359, 29.1392], [40.9358, 29.1386], [40.9357, 29.1380], [40.9357, 29.1374]] },
      { source: 3,  target: 21, length_km: 0.78, geometry: [[40.9359, 29.1392], [40.9353, 29.1421], [40.9346, 29.1451], [40.9340, 29.1480]] },
      { source: 5,  target: 37, length_km: 1.11, geometry: [[40.9207, 29.1662], [40.9240, 29.1669], [40.9273, 29.1676], [40.9306, 29.1682]] },
      { source: 37, target: 39, length_km: 1.24, geometry: [[40.9306, 29.1682], [40.9277, 29.1707], [40.9247, 29.1740], [40.9218, 29.1772]] },
      { source: 26, target: 39, length_km: 0.22, geometry: [[40.9220, 29.1790], [40.9219, 29.1784], [40.9218, 29.1778], [40.9218, 29.1772]] },
      { source: 8,  target: 40, length_km: 0.22, geometry: [[40.9061, 29.2111], [40.9060, 29.2105], [40.9059, 29.2099], [40.9059, 29.2093]] },
      { source: 30, target: 40, length_km: 1.50, geometry: [[40.9200, 29.1920], [40.9153, 29.1977], [40.9106, 29.2036], [40.9059, 29.2093]] },
];

function reverseEdge(edge: DemoEdge): DemoEdge {
  return {
    source: edge.target,
    target: edge.source,
    length_km: edge.length_km,
    geometry: [...edge.geometry].reverse(),
  };
}

function edgeKey(edge: DemoEdge): string {
  return `${edge.source}_${edge.target}`;
}

function buildClosedEdges(edges: DemoEdge[]): DemoEdge[] {
  const edgeMap = new Map<string, DemoEdge>();

  for (const edge of edges) {
    edgeMap.set(edgeKey(edge), edge);
    const reversed = reverseEdge(edge);
    if (!edgeMap.has(edgeKey(reversed))) {
      edgeMap.set(edgeKey(reversed), reversed);
    }
  }

  return Array.from(edgeMap.values());
}

const EDGES = buildClosedEdges(BASE_EDGES);

function findNode(nodeId: number) {
  const node = NODES.find((item) => item.id === nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  return node;
}

function coordinatesFromNodeIds(nodeIds: number[]): number[][] {
  return nodeIds.map((nodeId) => {
    const node = findNode(nodeId);
    return [node.lat, node.lon];
  });
}

export async function fetchDemoGraph(): Promise<DemoGraph> {
  await delay(300);

  return {
    nodes: NODES,
    edges: EDGES,
  };
}

export async function fetchOptimalRoute(
  request: RouteRequest
): Promise<RouteResponse> {
  await delay(300);
  void request;

  return {
    coordinates: coordinatesFromNodeIds([1, 3, 36, 3, 2, 4, 5, 37, 39, 26]),
    route_edge_ids: ["1_3", "3_36", "36_3", "3_2", "2_4", "4_5", "5_37", "37_39", "39_26"],
    total_energy_wh: 7400,
    distance_m: 6200,
    avg_traffic_density: 0.31,
    charging_stops: [
      { node_id: 36, lat: 40.9357, lon: 29.1374, name: "Şarj İstasyonu — Maltepe Metro" },
      { node_id: 37, lat: 40.9306, lon: 29.1682, name: "Şarj İstasyonu — Bağlarbaşı" },
      { node_id: 39, lat: 40.9218, lon: 29.1772, name: "Şarj İstasyonu — Dragos" },
    ],
    edge_energy_labels: [
      { edge_id: "3_36",  length_km: 0.22, energy_kwh: 0.32 },
      { edge_id: "36_3",  length_km: 0.22, energy_kwh: 0.32 },
      { edge_id: "5_37",  length_km: 1.11, energy_kwh: 1.61 },
      { edge_id: "37_39", length_km: 1.24, energy_kwh: 1.46 },
      { edge_id: "39_26", length_km: 0.22, energy_kwh: 0.30 },
    ],
    global_conditions: { temperature: 18, wind_speed: 12, weather_condition: 2 },
    warnings: [],
  };
}

export async function fetchDirectRoute(
  request: RouteRequest
): Promise<RouteResponse> {
  await delay(300);
  void request;

  return {
    coordinates: coordinatesFromNodeIds([1, 3, 2, 4, 5, 6, 7, 8]),
    route_edge_ids: ["1_3", "3_2", "2_4", "4_5", "5_6", "6_7", "7_8"],
    total_energy_wh: 11200,
    distance_m: 5800,
    avg_traffic_density: 0.72,
    charging_stops: [],
    edge_energy_labels: [],
    global_conditions: { temperature: 18, wind_speed: 12, weather_condition: 2 },
    warnings: [],
  };
}
