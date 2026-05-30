"use client";

import { useEffect, useMemo, useState } from "react";
import type { DemoNode, RouteResponse } from "@/types/route";

type ActiveField = "origin" | "destination" | null;

type SidePanelProps = {
  activeField: ActiveField;
  originNode: DemoNode | null;
  destinationNode: DemoNode | null;
  batteryRangeWh: string;
  optimalRoute: RouteResponse | null;
  directRoute: RouteResponse | null;
  isLoading: boolean;
  errorMessage: string | null;
  onActiveFieldChange: (field: ActiveField) => void;
  onBatteryRangeChange: (value: string) => void;
  onCalculateRoute: () => void;
  onClearRoute: () => void;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(Math.round(value));
}

function IstanbulClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const formattedDateTime = useMemo(() => {
    if (!now) {
      return "Yükleniyor...";
    }

    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(now);
  }, [now]);

  return (
    <div className="border-t border-white/10 pt-4 text-xs text-zinc-400">
      <div className="text-zinc-500">Europe/Istanbul</div>
      <div className="mt-1 font-mono text-zinc-200">{formattedDateTime}</div>
    </div>
  );
}

export default function SidePanel({
  activeField,
  originNode,
  destinationNode,
  batteryRangeWh,
  optimalRoute,
  directRoute,
  isLoading,
  errorMessage,
  onActiveFieldChange,
  onBatteryRangeChange,
  onCalculateRoute,
  onClearRoute,
}: SidePanelProps) {
  const isCalculateDisabled =
    !originNode || !destinationNode || !batteryRangeWh || isLoading;

  const shouldShowClearButton = Boolean(originNode || destinationNode);

  const warnings = [
    ...(optimalRoute?.warnings ?? []),
    ...(directRoute?.warnings ?? []),
  ];

  const energySavingWh =
    optimalRoute && directRoute
      ? directRoute.total_energy_wh - optimalRoute.total_energy_wh
      : 0;

  const energySavingPercent =
    optimalRoute && directRoute && directRoute.total_energy_wh > 0
      ? (energySavingWh / directRoute.total_energy_wh) * 100
      : 0;

  return (
    <aside className="flex h-screen w-80 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-zinc-950 p-5 text-white">
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          EV Route Optimizer
        </h1>

        <p className="mt-2 text-sm leading-5 text-zinc-400">
          GNN tahminli enerji tüketimine göre elektrikli araç rotası hesaplar.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <button
          type="button"
          onClick={() => onActiveFieldChange("origin")}
          className={`w-full rounded-xl border px-3 py-3 text-left transition ${
            activeField === "origin"
              ? "border-green-400 bg-green-400/10"
              : "border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          <span className="block text-xs text-zinc-400">Origin</span>
          <span className="mt-1 block text-sm font-semibold">
            {originNode ? originNode.label : "Haritadan başlangıç seç"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onActiveFieldChange("destination")}
          className={`w-full rounded-xl border px-3 py-3 text-left transition ${
            activeField === "destination"
              ? "border-red-400 bg-red-400/10"
              : "border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          <span className="block text-xs text-zinc-400">Destination</span>
          <span className="mt-1 block text-sm font-semibold">
            {destinationNode ? destinationNode.label : "Haritadan varış seç"}
          </span>
        </button>

        <label className="block">
          <span className="text-xs text-zinc-400">Batarya menzili</span>
          <input
            type="number"
            min="0"
            value={batteryRangeWh}
            onChange={(event) => onBatteryRangeChange(event.target.value)}
            placeholder="Örn: 15000 Wh (normal) / 2000 Wh (şarj senaryosu)"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-green-400"
          />
        </label>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Trafik yoğunluğu</span>
            <span className="font-semibold text-zinc-200">
              {optimalRoute
                ? `${Math.round(optimalRoute.avg_traffic_density * 100)}%`
                : "—"}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={isCalculateDisabled}
          onClick={onCalculateRoute}
          className="flex w-full items-center justify-center rounded-xl bg-green-500 px-3 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
              Hesaplanıyor...
            </span>
          ) : (
            "Rota Hesapla"
          )}
        </button>

        {shouldShowClearButton && (
          <button
            type="button"
            onClick={onClearRoute}
            className="w-full rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/15"
          >
            Sıfırla
          </button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {errorMessage && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            Aracınız yola çıkamaz, şarjınız çok az.
          </div>
        )}

        {optimalRoute && directRoute && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold">Route Stats</h2>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-green-400/20 bg-green-400/10 p-3">
                <div className="text-green-300">Optimal</div>
                <div className="mt-2 font-semibold">
                  {formatNumber(optimalRoute.total_energy_wh)} Wh
                </div>
                <div className="mt-1 text-zinc-400">
                  {formatNumber(optimalRoute.total_distance_m)} m
                </div>
              </div>

              <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3">
                <div className="text-red-300">Direct</div>
                <div className="mt-2 font-semibold">
                  {formatNumber(directRoute.total_energy_wh)} Wh
                </div>
                <div className="mt-1 text-zinc-400">
                  {formatNumber(directRoute.total_distance_m)} m
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-zinc-950/70 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Enerji tasarrufu</span>
                <span className="font-semibold text-green-300">
                  {formatNumber(energySavingWh)} Wh
                </span>
              </div>

              <div className="mt-2 flex justify-between">
                <span className="text-zinc-400">Tasarruf oranı</span>
                <span className="font-semibold text-green-300">
                  %{energySavingPercent.toFixed(1)}
                </span>
              </div>

              <div className="mt-2 flex justify-between">
                <span className="text-zinc-400">Şarj durağı</span>
                <span className="font-semibold text-yellow-300">
                  {optimalRoute.charging_stops.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6">
        <IstanbulClock />
      </div>
    </aside>
  );
}