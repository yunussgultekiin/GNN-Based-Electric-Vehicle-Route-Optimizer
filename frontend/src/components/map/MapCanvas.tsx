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
import L from "leaflet";

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

function toLatLng(coordinate: { lat: number; lon: number }): [number, number] {
  return [coordinate.lat, coordinate.lon];
}

function getEdgeMiddlePoint(edgeGeometry: { lat: number; lon: number }[]) {
  const middleIndex = Math.floor(edgeGeometry.length / 2);
  return edgeGeometry[middleIndex];
}

function createChargingIcon() {
  return L.divIcon({
    className: "charging-node-icon",
    html: `<div style="font-size:18px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 0 8px #f5c518);">⚡</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createRouteChargingIcon() {
  return L.divIcon({
    className: "route-charging-stop-icon",
    html: `<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:rgba(245,197,24,0.2);border:2px solid #f5c518;border-radius:50%;font-size:20px;box-shadow:0 0 16px rgba(245,197,24,0.5),0 0 4px rgba(245,197,24,0.8);">⚡</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function createDistanceLabel(
  distance: number,
  isVisible: boolean,
  energyWh?: number
) {
  const display = isVisible ? "inline-flex" : "none";
  const html = energyWh
    ? `<div style="display:${display};background:rgba(9,9,11,0.9);border:1px solid #27272a;border-radius:5px;padding:2px 7px;font-size:10px;font-family:monospace;white-space:nowrap;gap:5px;align-items:center;"><span style="color:#52525b;text-decoration:line-through;">${Math.round(distance)} m</span><span style="color:#00e676;font-weight:700;">${Math.round(energyWh)} Wh</span></div>`
    : `<div style="display:${isVisible ? "block" : "none"};background:rgba(9,9,11,0.9);border:1px solid #27272a;color:#71717a;font-size:10px;font-family:monospace;border-radius:5px;padding:2px 6px;white-space:nowrap;">${Math.round(distance)} m</div>`;

  return L.divIcon({
    className: "edge-distance-label",
    html,
    iconSize: energyWh ? [110, 22] : [44, 18],
    iconAnchor: energyWh ? [55, 11] : [22, 9],
  });
}

function ZoomLabelController({
  onZoomVisibilityChange,
}: {
  onZoomVisibilityChange: (visible: boolean) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const updateVisibility = () => {
      onZoomVisibilityChange(map.getZoom() >= 14);
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
}: {
  originNode: DemoNode | null;
  destinationNode: DemoNode | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!originNode || !destinationNode) {
      return;
    }

    const bounds: [[number, number], [number, number]] = [
      [originNode.coordinate.lat, originNode.coordinate.lon],
      [destinationNode.coordinate.lat, destinationNode.coordinate.lon],
    ];

    map.fitBounds(bounds, {
      padding: [50, 50],
    });
  }, [map, originNode, destinationNode]);

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

      if (originNode && destinationNode) {
        return;
      }

      const nearestNode = findNearestNode(
        event.latlng.lat,
        event.latlng.lng,
        demoGraph.nodes
      );

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

function getEnergyLabelForEdge(
  edge: DemoEdge,
  energyLabels: EdgeEnergyLabel[]
): EdgeEnergyLabel | undefined {
  return energyLabels.find((label) => label.edge_id === edge.id);
}

export default function MapCanvas({
  activeField,
  originNode,
  destinationNode,
  optimalRoute,
  directRoute,
  isLoading,
  onSelectOrigin,
  onSelectDestination,
}: MapCanvasProps) {
  const [demoGraph, setDemoGraph] = useState<DemoGraph | null>(null);
  const [labelsVisible, setLabelsVisible] = useState(true);

  const chargingIcon = useMemo(() => createChargingIcon(), []);
  const routeChargingIcon = useMemo(() => createRouteChargingIcon(), []);

  const optimalEnergyLabels = optimalRoute?.edge_energy_labels ?? [];

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
        opacity={0.75}
      />

      <ZoomLabelController onZoomVisibilityChange={setLabelsVisible} />

      <FitBoundsController
        originNode={originNode}
        destinationNode={destinationNode}
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
        const energyLabel = getEnergyLabelForEdge(edge, optimalEnergyLabels);

        return (
          <div key={edge.id}>
            <Polyline
              positions={edge.geometry.map(toLatLng)}
              pathOptions={{
                color: "white",
                weight: 1,
                opacity: 0.2,
              }}
            />

            <Marker
              position={toLatLng(middlePoint)}
              icon={createDistanceLabel(
                edge.distance_m,
                labelsVisible,
                energyLabel?.energy_wh
              )}
              interactive={false}
            />
          </div>
        );
      })}

      {optimalRoute &&
        demoGraph &&
        optimalRoute.edge_energy_labels.map((label) => {
          const edge = demoGraph.edges.find(
            (demoEdge) => demoEdge.id === label.edge_id
          );

          if (!edge) {
            return null;
          }

          return (
            <Polyline
              key={`optimal-${label.edge_id}`}
              positions={edge.geometry.map(toLatLng)}
              pathOptions={{
                color: "#22c55e",
                weight: 6,
                opacity: 0.95,
              }}
            />
          );
        })}

      {directRoute && (
        <Polyline
          positions={directRoute.coordinates.map(toLatLng)}
          pathOptions={{
            color: "#ef4444",
            weight: 4,
            opacity: 0.85,
          }}
        />
      )}

      {demoGraph?.nodes.map((node) => {
        const isOrigin = node.id === originNode?.id;
        const isDestination = node.id === destinationNode?.id;
        const isSelected = isOrigin || isDestination;
        const isDisabledForDestination =
          activeField === "destination" && node.id === originNode?.id;

        if (node.type === "charging" && !isSelected) {
          return (
            <Marker
              key={node.id}
              position={toLatLng(node.coordinate)}
              icon={chargingIcon}
              opacity={isDisabledForDestination ? 0.35 : 1}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {node.label}
              </Tooltip>
            </Marker>
          );
        }

        return (
          <CircleMarker
            key={node.id}
            center={toLatLng(node.coordinate)}
            radius={isSelected ? 8 : 5}
            pathOptions={{
              color: isOrigin
                ? "#22c55e"
                : isDestination
                ? "#ef4444"
                : "white",
              fillColor: isOrigin
                ? "#22c55e"
                : isDestination
                ? "#ef4444"
                : "transparent",
              fillOpacity: isSelected ? 1 : 0,
              weight: isSelected ? 3 : 2,
              opacity: isDisabledForDestination ? 0.35 : 1,
            }}
          >
            <Tooltip permanent={true} direction="top" offset={[0, -10]}>
              {node.label}
              {isOrigin ? " — Origin" : ""}
              {isDestination ? " — Destination" : ""}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {optimalRoute?.charging_stops.map((stop) => (
        <Marker
          key={`route-charging-${stop.id}`}
          position={toLatLng(stop.coordinate)}
          icon={routeChargingIcon}
        >
          <Popup>
            <div>
              <strong>{stop.name}</strong>
              <br />
              Charging time: {stop.estimated_charging_time_min} min
              {stop.connector_type && (
                <>
                  <br />
                  Connector: {stop.connector_type}
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}