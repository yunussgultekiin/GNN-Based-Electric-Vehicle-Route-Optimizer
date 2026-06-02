import type { DemoNode } from "@/types/route";

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degree: number): number {
  return (degree * Math.PI) / 180;
}

export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

export function findNearestNode(
  lat: number,
  lon: number,
  nodes: DemoNode[]
): DemoNode {
  if (nodes.length === 0) {
    throw new Error("Cannot find nearest node from an empty node list.");
  }

  return nodes.reduce((nearestNode, currentNode) => {
    const nearestDistance = calculateHaversineDistanceMeters(
      lat, lon, nearestNode.lat, nearestNode.lon
    );
    const currentDistance = calculateHaversineDistanceMeters(
      lat, lon, currentNode.lat, currentNode.lon
    );
    return currentDistance < nearestDistance ? currentNode : nearestNode;
  });
}
