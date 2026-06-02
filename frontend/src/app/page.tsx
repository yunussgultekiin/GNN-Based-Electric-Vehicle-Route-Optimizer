"use client";

import { useState } from "react";
import RouteMap from "@/components/map/RouteMap";
import ConditionsPanel from "@/components/ui/ConditionsPanel";
import SidePanel from "@/components/ui/SidePanel";
import {
  fetchDirectRoute,
  fetchOptimalRoute,
} from "@/lib/api";
import { getInitialConditions } from "@/lib/conditions";
import type { DemoNode, GlobalConditions, RouteResponse } from "@/types/route";

type ActiveField = "origin" | "destination" | null;

export default function Home() {
  const [activeField, setActiveField] = useState<ActiveField>("origin");
  const [originNode, setOriginNode] = useState<DemoNode | null>(null);
  const [destinationNode, setDestinationNode] = useState<DemoNode | null>(null);
  const [batteryRangeWh, setBatteryRangeWh] = useState("");
  const [optimalRoute, setOptimalRoute] = useState<RouteResponse | null>(null);
  const [directRoute, setDirectRoute] = useState<RouteResponse | null>(null);
  const [showOptimalRoute, setShowOptimalRoute] = useState(true);
  const [showDirectRoute, setShowDirectRoute] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [displayConditions, setDisplayConditions] = useState<GlobalConditions>(
    () => getInitialConditions()
  );

  function resetRoutes() {
    setOptimalRoute(null);
    setDirectRoute(null);
    setShowOptimalRoute(true);
    setShowDirectRoute(true);
    setErrorMessage(null);
  }

  function handleSelectOrigin(node: DemoNode) {
    setOriginNode(node);
    if (!destinationNode) {
      setActiveField("destination");
    } else {
      setActiveField(null);
    }
    resetRoutes();
  }

  function handleSelectDestination(node: DemoNode) {
    setDestinationNode(node);
    if (!originNode) {
      setActiveField("origin");
    } else {
      setActiveField(null);
    }
    resetRoutes();
  }

  async function calculateRoute() {
    if (!originNode || !destinationNode || !batteryRangeWh) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setOptimalRoute(null);
    setDirectRoute(null);
    setShowOptimalRoute(true);
    setShowDirectRoute(true);

    try {
      const request = {
        origin_node_id: originNode.id,
        dest_node_id: destinationNode.id,
        battery_range_wh: Number(batteryRangeWh),
      };

      const [optimal, direct] = await Promise.all([
        fetchOptimalRoute(request),
        fetchDirectRoute(request),
      ]);

      setOptimalRoute(optimal);
      setDirectRoute(direct);
      setDisplayConditions(optimal.global_conditions);
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
    setShowOptimalRoute(true);
    setShowDirectRoute(true);
    setErrorMessage(null);
    setDisplayConditions(getInitialConditions());
  }

  return (
    <main className="relative flex h-screen w-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,245,159,0.10),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(255,138,31,0.09),transparent_26%)]" />

      <div className="relative z-10 flex h-full w-full">
        <SidePanel
          activeField={activeField}
          originNode={originNode}
          destinationNode={destinationNode}
          batteryRangeWh={batteryRangeWh}
          optimalRoute={optimalRoute}
          directRoute={directRoute}
          showOptimalRoute={showOptimalRoute}
          showDirectRoute={showDirectRoute}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onActiveFieldChange={setActiveField}
          onBatteryRangeChange={setBatteryRangeWh}
          onCalculateRoute={calculateRoute}
          onClearRoute={clearRoute}
          onToggleOptimalRoute={() => setShowOptimalRoute((value) => !value)}
          onToggleDirectRoute={() => setShowDirectRoute((value) => !value)}
        />

        <div className="relative h-full flex-1 p-3 pl-0">
          <div className="relative h-full overflow-hidden rounded-[28px] border border-white/10 bg-black/40 shadow-[0_24px_90px_rgba(0,0,0,0.65)]">
            <RouteMap
              activeField={activeField}
              originNode={originNode}
              destinationNode={destinationNode}
              optimalRoute={optimalRoute}
              directRoute={directRoute}
              showOptimalRoute={showOptimalRoute}
              showDirectRoute={showDirectRoute}
              isLoading={isLoading}
              onSelectOrigin={handleSelectOrigin}
              onSelectDestination={handleSelectDestination}
            />

            <ConditionsPanel
              conditions={displayConditions}
              optimalRoute={optimalRoute}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
