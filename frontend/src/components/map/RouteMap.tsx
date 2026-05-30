"use client";

import dynamic from "next/dynamic";

import type { DemoNode, RouteResponse } from "@/types/route";

type ActiveField = "origin" | "destination" | null;

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-sm text-neutral-400">
      Loading map...
    </div>
  ),
});

type RouteMapProps = {
  activeField: ActiveField;
  originNode: DemoNode | null;
  destinationNode: DemoNode | null;
  optimalRoute: RouteResponse | null;
  directRoute: RouteResponse | null;
  isLoading: boolean;
  onSelectOrigin: (node: DemoNode) => void;
  onSelectDestination: (node: DemoNode) => void;
};

export default function RouteMap({
  activeField,
  originNode,
  destinationNode,
  optimalRoute,
  directRoute,
  isLoading,
  onSelectOrigin,
  onSelectDestination,
}: RouteMapProps) {
  return (
    <section className="relative h-full w-full overflow-hidden bg-neutral-950">
      {isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/30 text-sm text-white">
          Calculating route...
        </div>
      )}

      <div
        className={
          isLoading
            ? "h-full w-full pointer-events-none"
            : "h-full w-full"
        }
      >
        <MapCanvas
          activeField={activeField}
          originNode={originNode}
          destinationNode={destinationNode}
          optimalRoute={optimalRoute}
          directRoute={directRoute}
          isLoading={isLoading}
          onSelectOrigin={onSelectOrigin}
          onSelectDestination={onSelectDestination}
        />
      </div>
    </section>
  );
}