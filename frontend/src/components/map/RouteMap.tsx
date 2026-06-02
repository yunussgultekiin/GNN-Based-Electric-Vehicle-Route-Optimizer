"use client";

import dynamic from "next/dynamic";
import type { DemoNode, RouteResponse } from "@/types/route";

type ActiveField = "origin" | "destination" | null;

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#070708] text-sm text-zinc-400">
      Harita yükleniyor...
    </div>
  ),
});

type RouteMapProps = {
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

export default function RouteMap({
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
}: RouteMapProps) {
  return (
    <section className="relative h-full w-full overflow-hidden bg-[#070708]">
      {isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/45 text-sm text-white backdrop-blur-sm">
          <div className="rounded-2xl border border-white/10 bg-black/70 px-5 py-3 shadow-2xl">
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/25 border-t-emerald-300" />
              Rota hesaplanıyor...
            </span>
          </div>
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
          showOptimalRoute={showOptimalRoute}
          showDirectRoute={showDirectRoute}
          isLoading={isLoading}
          onSelectOrigin={onSelectOrigin}
          onSelectDestination={onSelectDestination}
        />
      </div>
    </section>
  );
}
