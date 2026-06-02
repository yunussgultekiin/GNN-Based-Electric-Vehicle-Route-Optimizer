"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { type LatLngBoundsExpression } from "leaflet";

import { fetchDemoGraph } from "@/lib/api";
import { findNearestNode } from "@/lib/map_utils";
import type {
  DemoEdge,
  DemoGraph,
  DemoNode,
  EdgeEnergyLabel,
  RouteResponse,
} from "@/types/route";

const MALTEPE_CENTER: [number, number] = [40.9369, 29.1556];
type ActiveField = "origin" | "destination" | null;

type MapCanvasProps = {
  activeField: ActiveField;
  originNode: DemoNode | null;
  destinationNode: DemoNode | null;
  optimalRoute: RouteResponse | null;
  directRoute: RouteResponse | null;
  showOptimalRoute: boolean;
  showDirectRoute: boolean;
  isLoading: boolean;
  onSelectOrigin: (node: DemoNode) => void;
  onSelectDestination: (node: DemoNode) => void;
};

type MapClickHandlerProps = {
  demoGraph: DemoGraph | null;
  activeField: ActiveField;
  originNode: DemoNode | null;
  destinationNode: DemoNode | null;
  isLoading: boolean;
  onSelectOrigin: (node: DemoNode) => void;
  onSelectDestination: (node: DemoNode) => void;
};

function getEdgeMiddlePoint(geometry: number[][]): [number, number] {
  const mid = geometry[Math.floor(geometry.length / 2)];
  return [mid[0], mid[1]];
}

function createChargingIcon() {
  return L.divIcon({
    className: "charging-node-icon",
    html: `<div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:rgba(246,196,49,0.18);border:1px solid rgba(246,196,49,0.75);border-radius:999px;color:#f6c431;font-size:16px;box-shadow:0 0 18px rgba(246,196,49,0.5);">⚡</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function createNearestChargingIcon() {
  return L.divIcon({
    className: "charging-node-icon-nearest",
    html: `<div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:rgba(239,68,68,0.20);border:2px solid rgba(239,68,68,0.90);border-radius:999px;color:#f6c431;font-size:17px;box-shadow:0 0 0 7px rgba(239,68,68,0.15),0 0 28px rgba(239,68,68,0.55);">⚡</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function createRouteChargingIcon() {
  return L.divIcon({
    className: "route-charging-stop-icon",
    html: `<div style="width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:rgba(246,196,49,0.24);border:2px solid #f6c431;border-radius:50%;font-size:19px;box-shadow:0 0 22px rgba(246,196,49,0.75),0 0 5px rgba(255,255,255,0.7);">⚡</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function createDistanceLabel(
  distanceM: number,
  isVisible: boolean,
  energyKwh?: number
) {
  const energyWh = energyKwh !== undefined ? energyKwh * 1000 : undefined;
  const display = isVisible ? "inline-flex" : "none";
  const html =
    energyWh !== undefined
      ? `<div style="display:${display};background:rgba(0,0,0,0.75);border:1px solid rgba(0,245,159,0.3);border-radius:10px;padding:8px 12px;font-size:13px;font-weight:600;font-family:monospace;white-space:nowrap;gap:6px;align-items:center;box-shadow:0 0 12px rgba(0,245,159,0.18);backdrop-filter:blur(10px);"><span style="color:white;text-decoration:line-through;">${Math.round(distanceM)} m</span><span style="color:#00f59f;">${Math.round(energyWh)} Wh</span></div>`
      : `<div style="display:${isVisible ? "block" : "none"};background:rgba(0,0,0,0.75);border:1px solid rgba(255,255,255,0.11);color:white;font-size:13px;font-weight:600;font-family:monospace;border-radius:10px;padding:8px 12px;white-space:nowrap;backdrop-filter:blur(10px);">${Math.round(distanceM)} m</div>`;

  return L.divIcon({
    className: "edge-distance-label",
    html,
    iconSize: energyWh !== undefined ? [160, 36] : [90, 36],
    iconAnchor: energyWh !== undefined ? [80, 18] : [45, 18],
  });
}

function getEdgeId(edge: DemoEdge): string {
  return `${edge.source}_${edge.target}`;
}

function findEdgeById(demoGraph: DemoGraph, edgeId: string): DemoEdge | undefined {
  const [source, target] = edgeId.split("_").map(Number);
  return (
    demoGraph.edges.find((e) => e.source === source && e.target === target) ??
    demoGraph.edges.find((e) => e.source === target && e.target === source)
  );
}

function getRouteEdges(route: RouteResponse | null, demoGraph: DemoGraph | null): DemoEdge[] {
  if (!route || !demoGraph || !route.route_edge_ids) {
    return [];
  }

  return route.route_edge_ids
    .map((edgeId) => findEdgeById(demoGraph, edgeId))
    .filter((edge): edge is DemoEdge => Boolean(edge));
}

function getEnergyLabelForEdge(
  edge: DemoEdge,
  energyLabels: EdgeEnergyLabel[]
): EdgeEnergyLabel | undefined {
  const fwd = `${edge.source}_${edge.target}`;
  const rev = `${edge.target}_${edge.source}`;
  return energyLabels.find((label) => label.edge_id === fwd || label.edge_id === rev);
}

function ZoomLabelController({
  onZoomVisibilityChange,
}: {
  onZoomVisibilityChange: (visible: boolean) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const updateVisibility = () => {
      onZoomVisibilityChange(map.getZoom() >= 15);
    };

    updateVisibility();
    map.on("zoomend", updateVisibility);

    return () => {
      map.off("zoomend", updateVisibility);
    };
  }, [map, onZoomVisibilityChange]);

  return null;
}

function FitBoundsController({
  originNode,
  destinationNode,
  optimalRoute,
  directRoute,
  showOptimalRoute,
  showDirectRoute,
}: {
  originNode: DemoNode | null;
  destinationNode: DemoNode | null;
  optimalRoute: RouteResponse | null;
  directRoute: RouteResponse | null;
  showOptimalRoute: boolean;
  showDirectRoute: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];

    if (originNode) {
      points.push([originNode.lat, originNode.lon]);
    }

    if (destinationNode) {
      points.push([destinationNode.lat, destinationNode.lon]);
    }

    if (showOptimalRoute && optimalRoute) {
      points.push(...(optimalRoute.coordinates as [number, number][]));
    }

    if (showDirectRoute && directRoute) {
      points.push(...(directRoute.coordinates as [number, number][]));
    }

    if (points.length < 2) {
      return;
    }

    map.fitBounds(points as LatLngBoundsExpression, { padding: [72, 72], maxZoom: 15 });
  }, [map, originNode, destinationNode, optimalRoute, directRoute, showOptimalRoute, showDirectRoute]);

  return null;
}

function MapClickHandler({
  demoGraph,
  activeField,
  originNode,
  destinationNode,
  isLoading,
  onSelectOrigin,
  onSelectDestination,
}: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      if (isLoading || !demoGraph || !activeField) {
        return;
      }

      const nearestNode = findNearestNode(
        event.latlng.lat,
        event.latlng.lng,
        demoGraph.nodes
      );

      if (nearestNode.type === "charging") {
        return;
      }

      if (activeField === "origin") {
        if (nearestNode.id === destinationNode?.id) {
          return;
        }
        onSelectOrigin(nearestNode);
        return;
      }

      if (activeField === "destination") {
        if (nearestNode.id === originNode?.id) {
          return;
        }
        onSelectDestination(nearestNode);
      }
    },
  });

  return null;
}

export default function MapCanvas({
  activeField,
  originNode,
  destinationNode,
  optimalRoute,
  directRoute,
  showOptimalRoute,
  showDirectRoute,
  isLoading,
  onSelectOrigin,
  onSelectDestination,
}: MapCanvasProps) {
  const [demoGraph, setDemoGraph] = useState<DemoGraph | null>(null);
  const [labelsVisible, setLabelsVisible] = useState(false);

  const chargingIcon = useMemo(() => createChargingIcon(), []);
  const nearestChargingIcon = useMemo(() => createNearestChargingIcon(), []);
  const routeChargingIcon = useMemo(() => createRouteChargingIcon(), []);

  const batteryWarning =
    (optimalRoute?.warnings ?? []).find((w) => w.code.startsWith("BATTERY_INSUFFICIENT")) ??
    (directRoute?.warnings ?? []).find((w) => w.code.startsWith("BATTERY_INSUFFICIENT")) ??
    null;

  const highlightedStationName =
    (batteryWarning?.params?.name as string | undefined) ?? null;

  const optimalEnergyLabels = optimalRoute?.edge_energy_labels ?? [];
  const optimalEdges = useMemo(
    () => getRouteEdges(optimalRoute, demoGraph),
    [optimalRoute, demoGraph]
  );
  const directEdges = useMemo(
    () => getRouteEdges(directRoute, demoGraph),
    [directRoute, demoGraph]
  );
  const activeEdgeIds = useMemo(() => {
    const normalize = (e: DemoEdge) =>
      e.source < e.target ? `${e.source}_${e.target}` : `${e.target}_${e.source}`;
    if (showOptimalRoute) return new Set(optimalEdges.map(normalize));
    if (showDirectRoute) return new Set(directEdges.map(normalize));
    return new Set<string>();
  }, [showOptimalRoute, showDirectRoute, optimalEdges, directEdges]);

  useEffect(() => {
    async function loadDemoGraph() {
      const graph = await fetchDemoGraph();
      setDemoGraph(graph);
    }

    loadDemoGraph();
  }, []);

  return (
    <MapContainer
      center={MALTEPE_CENTER}
      zoom={14}
      scrollWheelZoom
      className="h-full w-full"
      style={{ cursor: activeField !== null ? "crosshair" : "grab" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        opacity={0.88}
      />

      <ZoomLabelController onZoomVisibilityChange={setLabelsVisible} />

      <FitBoundsController
        originNode={originNode}
        destinationNode={destinationNode}
        optimalRoute={optimalRoute}
        directRoute={directRoute}
        showOptimalRoute={showOptimalRoute}
        showDirectRoute={showDirectRoute}
      />

      <MapClickHandler
        demoGraph={demoGraph}
        activeField={activeField}
        originNode={originNode}
        destinationNode={destinationNode}
        isLoading={isLoading}
        onSelectOrigin={onSelectOrigin}
        onSelectDestination={onSelectDestination}
      />

      {demoGraph?.edges.map((edge) => {
        const middlePoint = getEdgeMiddlePoint(edge.geometry);
        const energyLabel = showOptimalRoute
          ? getEnergyLabelForEdge(edge, optimalEnergyLabels)
          : undefined;

        return (
          <div key={getEdgeId(edge)}>
            <Polyline
              positions={edge.geometry as [number, number][]}
              pathOptions={{
                color: "#d4d4d8",
                weight: 2,
                opacity: 0.34,
              }}
            />

            {edge.source < edge.target && labelsVisible && activeEdgeIds.has(getEdgeId(edge)) && (
            <Marker
              position={middlePoint}
              icon={createDistanceLabel(
                edge.length_km * 1000,
                true,
                energyLabel?.energy_kwh
              )}
              interactive={false}
            />
            )}
          </div>
        );
      })}

      {showDirectRoute &&
        directRoute &&
        (directEdges.length > 0 ? (
          directEdges.map((edge) => (
            <Polyline
              key={`direct-${getEdgeId(edge)}`}
              positions={edge.geometry as [number, number][]}
              pathOptions={{
                color: "#f97316",
                weight: 3,
                opacity: 0.6,
                dashArray: "8 6",
              }}
            />
          ))
        ) : directRoute.coordinates.length > 0 ? (
          <Polyline
            positions={directRoute.coordinates as [number, number][]}
            pathOptions={{
              color: "#f97316",
              weight: 3,
              opacity: 0.6,
              dashArray: "8 6",
            }}
          />
        ) : null)}

      {showOptimalRoute &&
        optimalRoute &&
        (optimalEdges.length > 0 ? (
          optimalEdges.map((edge) => (
            <Polyline
              key={`optimal-${getEdgeId(edge)}`}
              positions={edge.geometry as [number, number][]}
              pathOptions={{
                color: "#00f59f",
                weight: 6,
                opacity: 0.95,
              }}
            />
          ))
        ) : optimalRoute.coordinates.length > 0 ? (
          <Polyline
            positions={optimalRoute.coordinates as [number, number][]}
            pathOptions={{
              color: "#00f59f",
              weight: 6,
              opacity: 0.95,
            }}
          />
        ) : null)}

      {showOptimalRoute &&
        optimalRoute &&
        demoGraph &&
        optimalRoute.edge_energy_labels.map((label) => {
          const edge = findEdgeById(demoGraph, label.edge_id);

          if (!edge) return null;

          return (
            <Polyline
              key={`energy-${label.edge_id}`}
              positions={edge.geometry as [number, number][]}
              pathOptions={{
                color: "#a7ff5f",
                weight: 10,
                opacity: 0.34,
              }}
            />
          );
        })}

      {demoGraph?.nodes.map((node) => {
        const isOrigin = node.id === originNode?.id;
        const isDestination = node.id === destinationNode?.id;
        const isSelected = isOrigin || isDestination;
        const isDisabledForDestination =
          activeField === "destination" && node.id === originNode?.id;

        if (node.type === "charging" && !isSelected) {
          const isNearest = node.name === highlightedStationName;
          return (
            <Marker
              key={node.id}
              position={[node.lat, node.lon]}
              icon={isNearest ? nearestChargingIcon : chargingIcon}
              opacity={isDisabledForDestination ? 0.35 : 1}
            >
              <Tooltip
                direction="top"
                offset={[0, -8]}
                permanent={isNearest}
              >
                {node.name}
                {isNearest ? " — En yakın şarj" : ""}
              </Tooltip>
            </Marker>
          );
        }

        return (
          <CircleMarker
            key={node.id}
            center={[node.lat, node.lon]}
            radius={isSelected ? 9 : 5}
            pathOptions={{
              color: isOrigin
                ? "#00f59f"
                : isDestination
                ? "#ff3b55"
                : "rgba(255,255,255,0.92)",
              fillColor: isOrigin
                ? "#00f59f"
                : isDestination
                ? "#ff3b55"
                : "rgba(8,8,10,0.72)",
              fillOpacity: isSelected ? 1 : 0.65,
              weight: isSelected ? 4 : 2,
              opacity: isDisabledForDestination ? 0.35 : 1,
            }}
          >
            <Tooltip permanent={isSelected} direction="top" offset={[0, -10]}>
              {node.name}
              {isOrigin ? " — Origin" : ""}
              {isDestination ? " — Destination" : ""}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {showOptimalRoute &&
        optimalRoute?.charging_stops.map((stop) => (
          <Marker
            key={`route-charging-${stop.node_id}`}
            position={[stop.lat, stop.lon]}
            icon={routeChargingIcon}
          >
            <Popup>
              <strong>{stop.name}</strong>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
