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

  const formattedDate = useMemo(() => {
    if (!now) return null;
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      dateStyle: "medium",
    }).format(now);
  }, [now]);

  const formattedTime = useMemo(() => {
    if (!now) return "Yükleniyor...";
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      timeStyle: "medium",
    }).format(now);
  }, [now]);

  return (
    <div className="border-t border-zinc-800/40 pt-4">
      {formattedDate && (
        <div className="text-[11px] font-bold text-white">{formattedDate}</div>
      )}
      <div className="text-2xl font-black text-white tracking-tight tabular-nums">
        {formattedTime}
      </div>
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

  const originButtonClass = (() => {
    const base =
      "w-full text-left px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-150";
    if (activeField === "origin")
      return `${base} bg-emerald-950/40 border-emerald-400 text-emerald-300`;
    if (originNode) return `${base} bg-zinc-900 border-zinc-700 text-white`;
    return `${base} bg-zinc-900 border-zinc-800 text-zinc-500`;
  })();

  const destinationButtonClass = (() => {
    const base =
      "w-full text-left px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-150";
    if (activeField === "destination")
      return `${base} bg-red-950/40 border-red-400 text-red-300`;
    if (destinationNode)
      return `${base} bg-zinc-900 border-zinc-700 text-white`;
    return `${base} bg-zinc-900 border-zinc-800 text-zinc-500`;
  })();

  const calculateButtonClass = (() => {
    if (isLoading)
      return "w-full py-3.5 rounded-xl bg-emerald-400 text-zinc-950 font-black text-sm tracking-wide opacity-75 cursor-not-allowed";
    if (isCalculateDisabled)
      return "w-full py-3.5 rounded-xl bg-emerald-400 text-zinc-950 font-black text-sm tracking-wide opacity-25 cursor-not-allowed pointer-events-none";
    return "w-full py-3.5 rounded-xl bg-emerald-400 text-zinc-950 font-black text-sm tracking-wide hover:bg-emerald-300 transition-colors";
  })();

  return (
    <aside className="flex h-screen w-80 shrink-0 flex-col overflow-y-auto border-r border-zinc-800/50 bg-[#0d0d0d] p-5 text-white">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          EV Route Optimizer
        </h1>
        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
          GNN tahminli enerji tüketimine göre elektrikli araç rotası hesaplar.
        </p>
      </div>

      <div className="mt-6 border-t border-zinc-800/40 pt-5 space-y-3">
        <button
          type="button"
          onClick={() => onActiveFieldChange("origin")}
          className={originButtonClass}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-0.5">
            Başlangıç
          </span>
          <span className="block">
            {originNode ? originNode.label : "Haritadan başlangıç seç"}
          </span>
          {activeField === "origin" && !originNode && (
            <span className="text-[10px] text-emerald-400/70 font-normal mt-0.5 block">
              ↓ haritada bir noktaya tıkla
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onActiveFieldChange("destination")}
          className={destinationButtonClass}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-0.5">
            Varış
          </span>
          <span className="block">
            {destinationNode
              ? destinationNode.label
              : "Haritadan varış seç"}
          </span>
          {activeField === "destination" && !destinationNode && (
            <span className="text-[10px] text-red-400/70 font-normal mt-0.5 block">
              ↓ haritada bir noktaya tıkla
            </span>
          )}
        </button>
      </div>

      <div className="mt-4 border-t border-zinc-800/40 pt-5">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5 block">
            Batarya menzili
          </span>
          <input
            type="number"
            min="0"
            value={batteryRangeWh}
            onChange={(event) => onBatteryRangeChange(event.target.value)}
            placeholder="Örn: 15000 Wh"
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 transition-all"
          />
        </label>
      </div>

      <div className="mt-4 border-t border-zinc-800/40 pt-5 space-y-2.5">
        <button
          type="button"
          disabled={isCalculateDisabled}
          onClick={onCalculateRoute}
          className={calculateButtonClass}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
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
            className="w-full py-2.5 rounded-xl border border-red-500/50 text-red-400 text-sm font-semibold hover:bg-red-500/10 hover:border-red-400 transition-all"
          >
            Sıfırla
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {errorMessage && (
          <div className="rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs px-4 py-3 leading-relaxed">
            {errorMessage}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs px-4 py-3 leading-relaxed">
            Aracınız yola çıkamaz, şarjınız çok az.
          </div>
        )}

        {optimalRoute && directRoute && (
          <div className="rounded-xl bg-zinc-900/80 border border-zinc-800/60 p-4 space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Rota İstatistikleri
              </div>

              <div className="space-y-3">
                <div className="border-l-2 border-emerald-400 pl-3">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                    Optimize Rota
                  </div>
                  <div className="text-xl font-black text-white tabular-nums">
                    {formatNumber(optimalRoute.total_energy_wh)} Wh
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                    {formatNumber(optimalRoute.total_distance_m)} m
                  </div>
                </div>

                <div className="border-l-2 border-red-400 pl-3">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                    Direkt Rota
                  </div>
                  <div className="text-xl font-black text-white tabular-nums">
                    {formatNumber(directRoute.total_energy_wh)} Wh
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                    {formatNumber(directRoute.total_distance_m)} m
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800/40 pt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">Enerji tasarrufu</span>
                <span className="text-emerald-400 font-black tabular-nums">
                  {formatNumber(energySavingWh)} Wh
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">Tasarruf oranı</span>
                <span className="text-emerald-400 font-black">
                  %{energySavingPercent.toFixed(1)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">Şarj durağı</span>
                <span className="text-amber-400 font-black">
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
