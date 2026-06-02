from fastapi import APIRouter
from app.services.demo.graph_builder import load_demo_graph_data, get_nodes_data

router = APIRouter(prefix="/demo", tags=["Demo"])

def _get_graph_edges(graph_data: dict) -> list[dict]:
    return graph_data.get("links") or graph_data.get("edges") or []

@router.get("/graph")
async def get_demo_graph():
    graph_data = load_demo_graph_data()
    nodes_data = get_nodes_data()
    nodes = list(nodes_data.values())

    edges = []
    for edge in _get_graph_edges(graph_data):
        source = int(edge["source"])
        target = int(edge["target"])

        edges.append({
            "source": source,
            "target": target,
            "length_km": round(float(edge.get("length", 0.0)), 4),
            "geometry": edge.get("geometry", []),
        })

    return {
        "nodes": nodes,
        "edges": edges,
    }