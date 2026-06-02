"use client";

import {
  getTrafficDensityLevel,
  getWeatherIcon,
  getWeatherLabel,
} from "@/lib/conditions";
import type { GlobalConditions, RouteResponse } from "@/types/route";

type ConditionsPanelProps = {
  conditions: GlobalConditions;
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
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-black";
    if (!trafficLevel) return base;
    if (trafficLevel.label === "Düşük")
      return `${base} bg-emerald-300/15 text-emerald-200 ring-1 ring-emerald-300/25`;
    if (trafficLevel.label === "Orta")
      return `${base} bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/25`;
    return `${base} bg-red-300/15 text-red-200 ring-1 ring-red-300/25`;
  })();

  return (
    <section className="absolute right-5 top-5 z-[1000] w-64 rounded-[28px] border border-white/10 bg-black/60 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
          Koşullar
        </h2>
        <span className="text-xl">
          {getWeatherIcon(conditions.weather_condition)}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Sıcaklık</span>
          <span className="text-sm font-black text-white">
            {conditions.temperature}°C
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Rüzgar</span>
          <span className="text-sm font-black text-white">
            {conditions.wind_speed} km/h
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Hava</span>
          <span className="text-sm font-black text-white">
            {getWeatherLabel(conditions.weather_condition)}
          </span>
        </div>

        {trafficLevel && typeof trafficDensity === "number" && (
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
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
