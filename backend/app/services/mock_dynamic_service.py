from __future__ import annotations
import random

class MockDynamicService:
    def get_global_conditions(self) -> dict:
        return {
            "temperature": 15.0,
            "wind_speed": 3.5,
            "weather_condition": 2,
        }

    def get_edge_traffic(self, edge_ids: list) -> dict:
        result: dict = {}
        for edge_id in edge_ids:
            rng = random.Random(hash(edge_id))
            result[edge_id] = rng.randint(1, 3)
        return result
