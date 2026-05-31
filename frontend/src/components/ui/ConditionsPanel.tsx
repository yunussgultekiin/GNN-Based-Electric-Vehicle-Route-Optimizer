"use client";

import {
  getTrafficDensityLevel,
  getWeatherIcon,
  getWeatherLabel,
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

  const trafficBadgeClass = (() => {
    const base =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold";
    if (!trafficLevel) return base;
    if (trafficLevel.label === "Düşük")
      return `${base} bg-emerald-400/15 text-emerald-400`;
    if (trafficLevel.label === "Orta")
      return `${base} bg-amber-400/15 text-amber-400`;
    return `${base} bg-red-400/15 text-red-400`;
  })();

  return (
    <section className="absolute right-5 top-5 z-[1000] w-56 rounded-2xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Koşullar
        </h2>
        <span className="text-lg">
          {getWeatherIcon(conditions.weather_condition)}
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Sıcaklık</span>
          <span className="text-sm font-bold text-white">
            {conditions.temperature_c}°C
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Rüzgar</span>
          <span className="text-sm font-bold text-white">
            {conditions.wind_speed_kmh} km/h
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Hava</span>
          <span className="text-sm font-bold text-white">
            {getWeatherLabel(conditions.weather_condition)}
          </span>
        </div>

        {trafficLevel && typeof trafficDensity === "number" && (
          <div className="flex items-center justify-between border-t border-zinc-800/40 pt-2.5">
            <span className="text-xs text-zinc-500">Trafik</span>
            <span className={trafficBadgeClass}>
              {trafficLevel.label} · {Math.round(trafficDensity * 100)}%
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
