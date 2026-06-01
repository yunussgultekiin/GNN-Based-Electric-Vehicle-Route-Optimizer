from fastapi import APIRouter
import json
import os
from pathlib import Path
from app.services.demo.graph_builder import build_demo_graph

router = APIRouter(prefix="/demo", tags=["Demo"])
GRAPH_FILE = Path("data/demo_graph.json")

@router.get("/graph")
async def get_demo_graph():
    """
    Demo graf verilerini döndürür. 
    Eğer data/demo_graph.json yoksa, önce graph_builder'ı çalıştırır.
    """
    if not GRAPH_FILE.exists():
        build_demo_graph()

    with open(GRAPH_FILE, "r", encoding="utf-8") as f:
        graph_data = json.load(f)
        
    # Frontend'in beklediği format (Node'lar ve Edge'ler)
    return {
        "nodes": graph_data.get("nodes", []),
        "edges": graph_data.get("links", [])
    }