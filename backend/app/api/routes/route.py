from fastapi import APIRouter, Request, HTTPException, status
from app.models.schemas import RouteRequest, RouteResponse, GlobalConditions, EdgeEnergyLabel, ChargingStop
from app.services.topology.topology_service import topology_service
from app.services.routing.dijkstra import find_min_energy_path, build_energy_weights, build_distance_weights
from app.services.routing.charging_injector import inject_charging_stops
from app.services.routing.route_builder import build_route_response
from app.services.mock_dynamic_service import MockDynamicService
from app.services.ml_features import build_edge_features

router = APIRouter(prefix="/route", tags=["Routing"])

def get_graph_data_helpers():
    adj_list = topology_service.get_adjacency_list()
    graph = topology_service.graph
    nodes_data = {node_id: data for node_id, data in graph.nodes(data=True)}
    return adj_list, graph, nodes_data

@router.post("/optimal", response_model=RouteResponse)
async def get_optimal_route(request: Request, payload: RouteRequest):
    ml_client = request.app.state.ml_client
    adj_list, graph, nodes_data = get_graph_data_helpers()

    if payload.origin_node_id not in adj_list or payload.dest_node_id not in adj_list:
        raise HTTPException(status_code=404, detail="Başlangıç veya bitiş düğümü haritada bulunamadı.")

    global_conds = MockDynamicService.get_global_conditions()
    edge_ids = [f"{u}_{v}" for u in adj_list for v, _ in adj_list[u]]
    traffic_data = MockDynamicService.get_edge_traffic(edge_ids)

    edges_list = [(u, v, attrs) for u in adj_list for v, attrs in adj_list[u]]
    edge_features = build_edge_features(edges_list, global_conds, traffic_data, battery_soc=payload.battery_soc)

    predicted_scores = await ml_client.predict(edge_features)

    edge_weights = build_energy_weights(adj_list, predicted_scores)
    initial_path, initial_energy = find_min_energy_path(adj_list, payload.origin_node_id, payload.dest_node_id, edge_weights)

    path, total_energy, stops_ids, warnings = inject_charging_stops(
        adj_list, payload.origin_node_id, payload.dest_node_id, edge_weights,
        initial_path, initial_energy, payload.battery_range_wh, nodes_data
    )

    route_data = build_route_response(path, adj_list, edge_weights, nodes_data, stops_ids, warnings)

    edge_labels = []
    for i in range(len(path) - 1):
        u, v = path[i], path[i+1]
        energy_wh = edge_weights.get((u, v), 0.0)
        length_km = next((attrs["length"] for neighbor, attrs in adj_list[u] if neighbor == v), 0.0)
        edge_labels.append(EdgeEnergyLabel(edge_id=f"{u}_{v}", length_km=length_km, energy_kwh=energy_wh / 1000.0))

    charging_stops = [
        ChargingStop(node_id=s_id, lat=nodes_data[s_id].get('y', 0.0), lon=nodes_data[s_id].get('x', 0.0), name=nodes_data[s_id].get('name', f"Durak {s_id}"))
        for s_id in stops_ids
    ]

    return RouteResponse(
        coordinates=route_data["polyline"],
        edge_energy_labels=edge_labels,
        total_energy_wh=route_data["total_energy_wh"],
        distance_m=route_data["distance_m"],
        charging_stops=charging_stops,
        avg_traffic_density=route_data["avg_traffic_density"],
        global_conditions=GlobalConditions(**global_conds),
        warnings=route_data["warnings"]
    )

@router.post("/direct", response_model=RouteResponse)
async def get_direct_route(payload: RouteRequest):
    adj_list, _, nodes_data = get_graph_data_helpers()

    if payload.origin_node_id not in adj_list or payload.dest_node_id not in adj_list:
        raise HTTPException(status_code=404, detail="Başlangıç veya bitiş düğümü haritada bulunamadı.")

    global_conds = MockDynamicService.get_global_conditions()

    distance_weights = build_distance_weights(adj_list)
    path, total_distance_km = find_min_energy_path(adj_list, payload.origin_node_id, payload.dest_node_id, distance_weights)

    route_data = build_route_response(path, adj_list, distance_weights, nodes_data, [], [])

    return RouteResponse(
        coordinates=route_data["polyline"],
        edge_energy_labels=[],
        total_energy_wh=0.0,
        distance_m=total_distance_km * 1000.0,
        charging_stops=[],
        avg_traffic_density=route_data["avg_traffic_density"],
        global_conditions=GlobalConditions(**global_conds),
        warnings=route_data["warnings"]
    )
