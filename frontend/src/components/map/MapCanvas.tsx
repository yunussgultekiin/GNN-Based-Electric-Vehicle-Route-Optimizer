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
    html: `<div class="text-lg">⚡</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createRouteChargingIcon() {
  return L.divIcon({
    className: "route-charging-stop-icon",
    html: `
      <div class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-yellow-200 bg-yellow-300 text-2xl shadow-[0_0_18px_rgba(250,204,21,0.95)]">
        ⚡
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function createDistanceLabel(
  distance: number,
  isVisible: boolean,
  energyWh?: number
) {
  const html = energyWh
    ? `<div class="${
        isVisible ? "block" : "hidden"
      } whitespace-nowrap rounded bg-neutral-900/90 px-1.5 py-0.5 text-[10px] shadow">
          <span class="text-neutral-400 line-through">${Math.round(
            distance
          )} m</span>
          <span class="mx-1 text-neutral-500">→</span>
          <span class="font-semibold text-green-400">${Math.round(
            energyWh
          )} Wh</span>
        </div>`
    : `<div class="${
        isVisible ? "block" : "hidden"
      } whitespace-nowrap rounded bg-neutral-800/80 px-1.5 py-0.5 text-[10px] text-neutral-300 shadow">${Math.round(
        distance
      )} m</div>`;

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
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
            <Tooltip direction="top" offset={[0, -8]}>
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