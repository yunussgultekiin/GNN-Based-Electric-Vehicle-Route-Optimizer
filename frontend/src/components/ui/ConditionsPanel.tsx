"use client";

import {
  getTrafficDensityLevel,
  getWeatherIcon,
  type InitialConditions,
} from "@/lib/conditions";
import type { RouteResponse } from "@/types/route";

type ConditionsPanelProps = {
  conditions: InitialConditions;
  optimalRoute: RouteResponse | null;
};

export default function ConditionsPanel({
  conditions,
  optimalRoute,
}: ConditionsPanelProps) {
  const trafficDensity = optimalRoute?.avg_traffic_density;
  const trafficLevel =
    typeof trafficDensity === "number"
      ? getTrafficDensityLevel(trafficDensity)
      : null;

  return (
    <section className="absolute right-5 top-5 z-[1000] w-64 rounded-2xl border border-white/10 bg-black/60 p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Koşullar</h2>
        <span className="text-2xl">
          {getWeatherIcon(conditions.weather_condition)}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Sıcaklık</span>
          <span className="font-semibold">
            {conditions.temperature_c}°C
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Rüzgar</span>
          <span className="font-semibold">
            {conditions.wind_speed_kmh} km/h
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Hava</span>
          <span className="font-semibold capitalize">
            {conditions.weather_condition}
          </span>
        </div>

        {trafficLevel && typeof trafficDensity === "number" && (
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-zinc-400">Trafik</span>
            <span
              className={`rounded-full border px-2 py-1 text-xs font-semibold ${trafficLevel.className}`}
            >
              {trafficLevel.label} · {Math.round(trafficDensity * 100)}%
            </span>
          </div>
        )}
      </div>
    </section>
  );
}