"use client";

import { useMemo, useState } from "react";

import RouteMap from "@/components/map/RouteMap";
import ConditionsPanel from "@/components/ui/ConditionsPanel";
import SidePanel from "@/components/ui/SidePanel";
import {
  fetchDirectRoute,
  fetchOptimalRoute,
} from "@/lib/api";
import {
  getInitialConditions,
  mapInitialConditionsToGlobalConditions,
} from "@/lib/conditions";
import type { DemoNode, RouteResponse } from "@/types/route";

type ActiveField = "origin" | "destination" | null;

export default function Home() {
  const [activeField, setActiveField] = useState<ActiveField>("origin");
  const [originNode, setOriginNode] = useState<DemoNode | null>(null);
  const [destinationNode, setDestinationNode] = useState<DemoNode | null>(null);
  const [batteryRangeWh, setBatteryRangeWh] = useState("");
  const [optimalRoute, setOptimalRoute] = useState<RouteResponse | null>(null);
  const [directRoute, setDirectRoute] = useState<RouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialConditions = useMemo(() => getInitialConditions(), []);

  function handleSelectOrigin(node: DemoNode) {
    setOriginNode(node);

    if (!destinationNode) {
      setActiveField("destination");
    } else {
      setActiveField(null);
    }

    setOptimalRoute(null);
    setDirectRoute(null);
    setErrorMessage(null);
  }

  function handleSelectDestination(node: DemoNode) {
    setDestinationNode(node);

    if (!originNode) {
      setActiveField("origin");
    } else {
      setActiveField(null);
    }

    setOptimalRoute(null);
    setDirectRoute(null);
    setErrorMessage(null);
  }

  async function calculateRoute() {
    if (!originNode || !destinationNode || !batteryRangeWh) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setOptimalRoute(null);
    setDirectRoute(null);

    try {
      const request = {
        origin: originNode.coordinate,
        destination: destinationNode.coordinate,
        battery_capacity_wh: 75_000,
        current_battery_wh: Number(batteryRangeWh),
        vehicle_model: "demo-ev",
        global_conditions: mapInitialConditionsToGlobalConditions(
          initialConditions
        ),
      };

      const [optimal, direct] = await Promise.all([
        fetchOptimalRoute(request),
        fetchDirectRoute(request),
      ]);

      setOptimalRoute(optimal);
      setDirectRoute(direct);
    } catch {
      setOptimalRoute(null);
      setDirectRoute(null);
      setErrorMessage(
        "Rota hesaplanırken bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function clearRoute() {
    setOriginNode(null);
    setDestinationNode(null);
    setBatteryRangeWh("");
    setActiveField("origin");
    setOptimalRoute(null);
    setDirectRoute(null);
    setErrorMessage(null);
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-white">
      <SidePanel
        activeField={activeField}
        originNode={originNode}
        destinationNode={destinationNode}
        batteryRangeWh={batteryRangeWh}
        optimalRoute={optimalRoute}
        directRoute={directRoute}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onActiveFieldChange={setActiveField}
        onBatteryRangeChange={setBatteryRangeWh}
        onCalculateRoute={calculateRoute}
        onClearRoute={clearRoute}
      />

      <div className="relative h-full flex-1">
        <RouteMap
          activeField={activeField}
          originNode={originNode}
          destinationNode={destinationNode}
          optimalRoute={optimalRoute}
          directRoute={directRoute}
          isLoading={isLoading}
          onSelectOrigin={handleSelectOrigin}
          onSelectDestination={handleSelectDestination}
        />

        <ConditionsPanel
          conditions={initialConditions}
          optimalRoute={optimalRoute}
        />
      </div>
    </main>
  );
}