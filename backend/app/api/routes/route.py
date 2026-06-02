from fastapi import APIRouter, Request, HTTPException

from app.models.schemas import (
    ChargingStop,
    EdgeEnergyLabel,
    GlobalConditions,
    RouteRequest,
    RouteResponse,
)
from app.services.demo.graph_builder import (
    get_adjacency_list as get_demo_adjacency_list,
    get_nodes_data,
)
from app.services.gnn_payload_builder import build_edge_features
from app.services.mock_dynamic_service import MockDynamicService
from app.services.routing.charging_injector import (
    build_nearest_charging_warning,
    find_nearest_charging_node,
    get_charging_nodes,
    inject_charging_stops,
)
from app.services.routing.dijkstra import (
    build_distance_weights,
    build_energy_weights,
    find_min_energy_path,
)
from app.services.routing.route_builder import build_route_response

from app.core.logging import logger as _logger
router = APIRouter(prefix="/route", tags=["Routing"])

MIN_WH_PER_KM = 150.0
MAX_WH_PER_KM = 600.0
DEFAULT_WH_PER_KM = 700.0

def get_graph_data_helpers():
    adj_list = get_demo_adjacency_list()
    nodes_data = get_nodes_data()
    return adj_list, nodes_data

def build_edge_rows(adjacency_list: dict) -> list[tuple[int, int, dict]]:
    rows: list[tuple[int, int, dict]] = []

    for source, neighbors in adjacency_list.items():
        for target, attrs in neighbors:
            edge_attrs = dict(attrs)
            edge_attrs["id"] = f"{source}_{target}"
            edge_attrs["source"] = source
            edge_attrs["target"] = target
            rows.append((source, target, edge_attrs))

    return rows

def apply_traffic_to_adjacency(adjacency_list: dict, traffic_data: dict) -> None:
    for source, neighbors in adjacency_list.items():
        for target, attrs in neighbors:
            edge_id = f"{source}_{target}"
            attrs["traffic_density"] = traffic_data.get(edge_id, 1)

def normalize_model_scores_to_energy_wh(
    edge_rows: list[tuple[int, int, dict]],
    predicted_scores: list[float],
) -> dict[tuple[int, int], float]:
    if not edge_rows:
        return {}

    if len(predicted_scores) != len(edge_rows):
        raise RuntimeError(
            f"GNN score count mismatch: scores={len(predicted_scores)} edges={len(edge_rows)}"
        )

    raw_scores = [float(score) for score in predicted_scores]
    min_score = min(raw_scores)
    max_score = max(raw_scores)
    score_range = max_score - min_score

    _logger.info("normalize_model_scores: score_range=%.6f min=%.6f max=%.6f", score_range, min_score, max_score)
    if score_range == 0:
        _logger.warning("All GNN scores identical — check model output")

    all_lengths = [max(float(row[2].get("length", 0.0)), 0.001) for row in edge_rows]

    energy_wh: dict[tuple[int, int], float] = {}

    for index, (source, target, _attrs) in enumerate(edge_rows):
        length_km = all_lengths[index]
        raw_score = raw_scores[index]

        if score_range > 1e-9:
            relative_score = (raw_score - min_score) / score_range
        else:
            relative_score = 0.5

        relative_score = max(0.0, min(1.0, relative_score))
        amplified = relative_score ** 0.5

        wh_per_km = MIN_WH_PER_KM + amplified * (MAX_WH_PER_KM - MIN_WH_PER_KM)
        energy_wh[(source, target)] = length_km * wh_per_km

    if energy_wh:
        wh_vals = list(energy_wh.values())
        _logger.info(
            "normalize_model_scores: energy_wh min=%.1f max=%.1f mean=%.1f",
            min(wh_vals), max(wh_vals), sum(wh_vals) / len(wh_vals),
        )

    return energy_wh

def build_charging_stops(
    stops_ids: list[int],
    nodes_data: dict[int, dict],
) -> list[ChargingStop]:
    charging_stops: list[ChargingStop] = []

    for stop_id in stops_ids:
        node = nodes_data.get(stop_id, {})
        charging_stops.append(
            ChargingStop(
                node_id=stop_id,
                lat=float(node.get("lat", node.get("y", 0.0))),
                lon=float(node.get("lon", node.get("x", 0.0))),
                name=node.get("name", str(stop_id)),
            )
        )

    return charging_stops

def build_edge_energy_labels(route_data: dict) -> list[EdgeEnergyLabel]:
    return [
        EdgeEnergyLabel(
            edge_id=label["edge_id"],
            length_km=label["length_km"],
            energy_kwh=label["energy_kwh"],
        )
        for label in route_data["edge_energy_labels"]
    ]

def predict_energy_weights(
    gnn_client,
    adjacency_list: dict,
    global_conditions: dict,
    traffic_data: dict,
    battery_soc: float,
) -> dict[tuple[int, int], float]:
    edge_rows = build_edge_rows(adjacency_list)
    _logger.info("predict_energy_weights: sending %d edges to GNN service", len(edge_rows))

    edge_features = build_edge_features(
        [edge_attrs for _, _, edge_attrs in edge_rows],
        global_conditions,
        traffic_data,
        battery_soc=battery_soc,
    )

    predicted_scores = gnn_client.predict(edge_features)

    raw_scores_preview = predicted_scores[:5]
    scores_min = min(predicted_scores)
    scores_max = max(predicted_scores)
    _logger.info(
        "predict_energy_weights: raw scores first_5=%s min=%.6f max=%.6f",
        raw_scores_preview, scores_min, scores_max,
    )
    if scores_max - scores_min < 0.01:
        _logger.warning(
            "GNN output has near-zero variance — model may be returning constant predictions"
        )

    energy_scores = normalize_model_scores_to_energy_wh(
        edge_rows=edge_rows,
        predicted_scores=predicted_scores,
    )

    if energy_scores:
        wh_vals = list(energy_scores.values())
        _logger.info(
            "Edge energy Wh: min=%.0f max=%.0f mean=%.0f | edges=%d",
            min(wh_vals), max(wh_vals), sum(wh_vals) / len(wh_vals), len(wh_vals),
        )

    return build_energy_weights(adjacency_list, energy_scores)

@router.post("/optimal", response_model=RouteResponse)
async def get_optimal_route(request: Request, payload: RouteRequest):
    gnn_client = request.app.state.gnn_client
    adj_list, nodes_data = get_graph_data_helpers()

    if payload.origin_node_id not in adj_list or payload.dest_node_id not in adj_list:
        raise HTTPException(
            status_code=404,
            detail={"code": "NODE_NOT_FOUND"},
        )

    dynamic_service = MockDynamicService()
    global_conditions = dynamic_service.get_global_conditions()

    edge_ids = [
        f"{source}_{target}"
        for source in adj_list
        for target, _ in adj_list[source]
    ]
    traffic_data = dynamic_service.get_edge_traffic(edge_ids)
    apply_traffic_to_adjacency(adj_list, traffic_data)

    energy_wh = predict_energy_weights(
        gnn_client=gnn_client,
        adjacency_list=adj_list,
        global_conditions=global_conditions,
        traffic_data=traffic_data,
        battery_soc=payload.battery_soc,
    )

    initial_path, _ = find_min_energy_path(
        adj_list,
        payload.origin_node_id,
        payload.dest_node_id,
        energy_wh,
    )

    initial_energy_wh = sum(
        energy_wh.get((initial_path[i], initial_path[i + 1]), 0.0)
        for i in range(len(initial_path) - 1)
    ) if initial_path else 0.0

    path, total_energy_wh, stops_ids, warnings = inject_charging_stops(
        adj_list,
        payload.origin_node_id,
        payload.dest_node_id,
        energy_wh,
        initial_path,
        initial_energy_wh,
        payload.battery_range_wh,
        nodes_data,
    )

    if total_energy_wh > payload.battery_range_wh:
        source_data = nodes_data.get(payload.origin_node_id, {})
        src_lat = float(source_data.get("lat", 0))
        src_lon = float(source_data.get("lon", 0))
        charging_nodes = get_charging_nodes(nodes_data)
        nearest_node = find_nearest_charging_node(src_lat, src_lon, charging_nodes, nodes_data)
        partial_path, _ = find_min_energy_path(adj_list, payload.origin_node_id, nearest_node, energy_wh)
        warning = build_nearest_charging_warning(
            src_lat, src_lon, charging_nodes, nodes_data,
            source=payload.origin_node_id, adjacency_list=adj_list, routing_weights=energy_wh,
        )

        if partial_path:
            partial_data = build_route_response(
                path=partial_path,
                adjacency_list=adj_list,
                energy_weights=energy_wh,
                nodes_data=nodes_data,
                charging_stops=[nearest_node],
                warnings=[warning],
            )
            warning["params"]["distance_m"] = round(partial_data["distance_m"])
            return RouteResponse(
                coordinates=partial_data["coordinates"],
                route_edge_ids=partial_data["route_edge_ids"],
                edge_energy_labels=build_edge_energy_labels(partial_data),
                total_energy_wh=partial_data["total_energy_wh"],
                distance_m=partial_data["distance_m"],
                charging_stops=build_charging_stops([nearest_node], nodes_data),
                avg_traffic_density=partial_data["avg_traffic_density"],
                global_conditions=GlobalConditions(**global_conditions),
                warnings=[warning],
            )

        return RouteResponse(
            coordinates=[],
            route_edge_ids=[],
            edge_energy_labels=[],
            total_energy_wh=0.0,
            distance_m=0.0,
            charging_stops=[],
            avg_traffic_density=0.0,
            global_conditions=GlobalConditions(**global_conditions),
            warnings=[warning],
        )

    route_data = build_route_response(
        path=path,
        adjacency_list=adj_list,
        energy_weights=energy_wh,
        nodes_data=nodes_data,
        charging_stops=stops_ids,
        warnings=warnings,
    )

    return RouteResponse(
        coordinates=route_data["coordinates"],
        route_edge_ids=route_data["route_edge_ids"],
        edge_energy_labels=build_edge_energy_labels(route_data),
        total_energy_wh=route_data["total_energy_wh"],
        distance_m=route_data["distance_m"],
        charging_stops=build_charging_stops(stops_ids, nodes_data),
        avg_traffic_density=route_data["avg_traffic_density"],
        global_conditions=GlobalConditions(**global_conditions),
        warnings=route_data["warnings"],
    )

@router.post("/direct", response_model=RouteResponse)
async def get_direct_route(request: Request, payload: RouteRequest):
    gnn_client = request.app.state.gnn_client
    adj_list, nodes_data = get_graph_data_helpers()

    if payload.origin_node_id not in adj_list or payload.dest_node_id not in adj_list:
        raise HTTPException(
            status_code=404,
            detail={"code": "NODE_NOT_FOUND"},
        )

    dynamic_service = MockDynamicService()
    global_conditions = dynamic_service.get_global_conditions()

    edge_ids = [
        f"{source}_{target}"
        for source in adj_list
        for target, _ in adj_list[source]
    ]
    traffic_data = dynamic_service.get_edge_traffic(edge_ids)
    apply_traffic_to_adjacency(adj_list, traffic_data)

    energy_wh = predict_energy_weights(
        gnn_client=gnn_client,
        adjacency_list=adj_list,
        global_conditions=global_conditions,
        traffic_data=traffic_data,
        battery_soc=payload.battery_soc,
    )

    distance_weights = build_distance_weights(adj_list)

    path, _ = find_min_energy_path(
        adj_list,
        payload.origin_node_id,
        payload.dest_node_id,
        distance_weights,
    )

    route_data = build_route_response(
        path=path,
        adjacency_list=adj_list,
        energy_weights=energy_wh,
        nodes_data=nodes_data,
        charging_stops=[],
        warnings=[],
    )

    if (
        route_data["total_energy_wh"] > 0
        and route_data["total_energy_wh"] > payload.battery_range_wh
    ):
        source_data = nodes_data.get(payload.origin_node_id, {})
        src_lat = float(source_data.get("lat", 0))
        src_lon = float(source_data.get("lon", 0))
        charging_nodes = get_charging_nodes(nodes_data)
        warning = (
            build_nearest_charging_warning(
                src_lat, src_lon, charging_nodes, nodes_data,
                source=payload.origin_node_id, adjacency_list=adj_list, routing_weights=energy_wh,
            )
            if charging_nodes
            else {"code": "BATTERY_INSUFFICIENT_NO_STATION"}
        )
        route_data = {
            "coordinates": [],
            "route_edge_ids": [],
            "edge_energy_labels": [],
            "total_energy_wh": 0.0,
            "distance_m": 0.0,
            "charging_stops": [],
            "avg_traffic_density": 0.0,
            "warnings": [warning],
        }

    return RouteResponse(
        coordinates=route_data["coordinates"],
        route_edge_ids=route_data["route_edge_ids"],
        edge_energy_labels=build_edge_energy_labels(route_data),
        total_energy_wh=route_data["total_energy_wh"],
        distance_m=route_data["distance_m"],
        charging_stops=[],
        avg_traffic_density=route_data["avg_traffic_density"],
        global_conditions=GlobalConditions(**global_conditions),
        warnings=route_data["warnings"],
    )