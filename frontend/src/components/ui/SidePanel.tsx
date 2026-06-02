"use client";

import { useEffect, useMemo, useState } from "react";
import type { DemoNode, RouteResponse, RouteWarning } from "@/types/route";

type ActiveField = "origin" | "destination" | null;

type SidePanelProps = {
  activeField: ActiveField;
  originNode: DemoNode | null;
  destinationNode: DemoNode | null;
  batteryRangeWh: string;
  optimalRoute: RouteResponse | null;
  directRoute: RouteResponse | null;
  showOptimalRoute: boolean;
  showDirectRoute: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  onActiveFieldChange: (field: ActiveField) => void;
  onBatteryRangeChange: (value: string) => void;
  onCalculateRoute: () => void;
  onClearRoute: () => void;
  onToggleOptimalRoute: () => void;
  onToggleDirectRoute: () => void;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(Math.round(value));
}

function formatWarning(w: { code: string; params?: Record<string, unknown> }): string {
  if (w.code === "BATTERY_INSUFFICIENT_NEAREST_STATION") {
    const name = w.params?.name ?? "";
    const dist = w.params?.distance_m ?? "";
    return `Batarya yetersiz. En yakın şarj istasyonu: ${name} (${dist}m uzaklıkta)`;
  }
  if (w.code === "BATTERY_INSUFFICIENT_NO_STATION") {
    return "Batarya yetersiz ve çevrede şarj istasyonu bulunamadı.";
  }
  return w.code;
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      {formattedDate && (
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
          {formattedDate}
        </div>
      )}
      <div className="mt-1 text-2xl font-black tracking-tight text-white tabular-nums">
        {formattedTime}
      </div>
    </div>
  );
}

function RouteToggleButton({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: "optimal" | "direct";
  onClick: () => void;
}) {
  const activeClass =
    tone === "optimal"
      ? "border-emerald-300/70 bg-emerald-400/15 text-emerald-200 shadow-[0_0_24px_rgba(0,245,159,0.12)]"
      : "border-orange-300/70 bg-orange-400/15 text-orange-200 shadow-[0_0_24px_rgba(255,138,31,0.12)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-black transition-all ${
        active
          ? activeClass
          : "border-white/10 bg-white/[0.035] text-zinc-500 hover:border-white/20 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

export default function SidePanel({
  activeField,
  originNode,
  destinationNode,
  batteryRangeWh,
  optimalRoute,
  directRoute,
  showOptimalRoute,
  showDirectRoute,
  isLoading,
  errorMessage,
  onActiveFieldChange,
  onBatteryRangeChange,
  onCalculateRoute,
  onClearRoute,
  onToggleOptimalRoute,
  onToggleDirectRoute,
}: SidePanelProps) {
  const isCalculateDisabled =
    !originNode || !destinationNode || !batteryRangeWh || isLoading;

  const shouldShowClearButton = Boolean(originNode || destinationNode);

  const warnings = [
    ...(optimalRoute?.warnings ?? []),
    ...(directRoute?.warnings ?? []),
  ];

  const seenCodes = new Set<string>();
  const uniqueWarnings = warnings.filter((w) => {
    if (!w.code.startsWith("BATTERY_INSUFFICIENT")) return false;
    if (seenCodes.has(w.code)) return false;
    seenCodes.add(w.code);
    return true;
  });

  const hasValidRoute =
    (optimalRoute?.coordinates.length ?? 0) > 0 ||
    (directRoute?.coordinates.length ?? 0) > 0;

  const energySavingWh =
    optimalRoute && directRoute
      ? directRoute.total_energy_wh - optimalRoute.total_energy_wh
      : 0;

  const energySavingPercent =
    optimalRoute && directRoute && directRoute.total_energy_wh > 0
      ? (energySavingWh / directRoute.total_energy_wh) * 100
      : 0;

  const optimalDistanceM = optimalRoute?.distance_m ?? 0;
  const directDistanceM = directRoute?.distance_m ?? 0;

  const originButtonClass = (() => {
    const base =
      "w-full text-left px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all duration-150";
    if (activeField === "origin")
      return `${base} bg-emerald-400/12 border-emerald-300/70 text-emerald-100 shadow-[0_0_28px_rgba(0,245,159,0.10)]`;
    if (originNode) return `${base} bg-white/[0.045] border-white/10 text-white`;
    return `${base} bg-white/[0.035] border-white/10 text-zinc-500 hover:border-white/20`;
  })();

  const destinationButtonClass = (() => {
    const base =
      "w-full text-left px-4 py-3.5 rounded-2xl border text-sm font-semibold transition-all duration-150";
    if (activeField === "destination")
      return `${base} bg-red-400/12 border-red-300/70 text-red-100 shadow-[0_0_28px_rgba(255,59,85,0.10)]`;
    if (destinationNode)
      return `${base} bg-white/[0.045] border-white/10 text-white`;
    return `${base} bg-white/[0.035] border-white/10 text-zinc-500 hover:border-white/20`;
  })();

  const calculateButtonClass = (() => {
    if (isLoading)
      return "w-full py-3.5 rounded-2xl bg-emerald-300 text-black font-black text-sm tracking-wide opacity-80 cursor-not-allowed";
    if (isCalculateDisabled)
      return "w-full py-3.5 rounded-2xl bg-emerald-300 text-black font-black text-sm tracking-wide opacity-25 cursor-not-allowed pointer-events-none";
    return "w-full py-3.5 rounded-2xl bg-emerald-300 text-black font-black text-sm tracking-wide hover:bg-emerald-200 transition-all shadow-[0_0_30px_rgba(0,245,159,0.2)]";
  })();

  return (
    <aside className="flex h-screen w-[350px] shrink-0 flex-col overflow-y-auto p-5 pr-4 text-white">
      <div className="rounded-[28px] border border-white/10 bg-black/45 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200">
          GNN Energy
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-white">
          EV Route Optimizer
        </h1>
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
          GNN tahminli enerji tüketimine göre en verimli elektrikli araç rotasını hesaplar.
        </p>
      </div>

      <div className="mt-4 rounded-[28px] border border-white/10 bg-black/38 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onActiveFieldChange("origin")}
            className={originButtonClass}
          >
            <span className="mb-0.5 block text-[10px] font-black uppercase tracking-[0.22em] opacity-60">
              Başlangıç
            </span>
            <span className="block">
              {originNode ? originNode.name : "Haritadan başlangıç seç"}
            </span>
            {activeField === "origin" && !originNode && (
              <span className="mt-1 block text-[10px] font-normal text-emerald-300/75">
                Haritada bir node seç
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onActiveFieldChange("destination")}
            className={destinationButtonClass}
          >
            <span className="mb-0.5 block text-[10px] font-black uppercase tracking-[0.22em] opacity-60">
              Varış
            </span>
            <span className="block">
              {destinationNode
                ? destinationNode.name
                : "Haritadan varış seç"}
            </span>
            {activeField === "destination" && !destinationNode && (
              <span className="mt-1 block text-[10px] font-normal text-red-300/75">
                Haritada bir node seç
              </span>
            )}
          </button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            Batarya menzili
          </span>
          <input
            type="number"
            min="0"
            value={batteryRangeWh}
            onChange={(event) => onBatteryRangeChange(event.target.value)}
            placeholder="Örn: 15000 Wh"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/10"
          />
        </label>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            disabled={isCalculateDisabled}
            onClick={onCalculateRoute}
            className={calculateButtonClass}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
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
              className="w-full rounded-2xl border border-red-400/35 py-2.5 text-sm font-bold text-red-300 transition-all hover:border-red-300/70 hover:bg-red-400/10"
            >
              Sıfırla
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {errorMessage && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-200">
            {errorMessage}
          </div>
        )}

        {uniqueWarnings.length > 0 && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-200 space-y-1">
            {uniqueWarnings.map((w) => (
              <p key={w.code}>{formatWarning(w)}</p>
            ))}
          </div>
        )}

        {optimalRoute && directRoute && hasValidRoute && uniqueWarnings.length === 0 && (
          <div className="rounded-[28px] border border-white/10 bg-black/42 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                Rota İstatistikleri
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(0,245,159,0.9)]" />
            </div>

            <div className="mt-3 flex gap-2">
              <RouteToggleButton
                label="Optimal"
                active={showOptimalRoute}
                tone="optimal"
                onClick={onToggleOptimalRoute}
              />
              <RouteToggleButton
                label="Direkt"
                active={showDirectRoute}
                tone="direct"
                onClick={onToggleDirectRoute}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.08] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/70">
                  Optimize Rota
                </div>
                <div className="mt-1 text-xl font-black text-white tabular-nums">
                  {formatNumber(optimalRoute.total_energy_wh)} Wh
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 tabular-nums">
                  {formatNumber(optimalDistanceM)} m
                </div>
              </div>

              <div className="rounded-2xl border border-orange-300/25 bg-orange-300/[0.08] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/70">
                  Direkt Rota
                </div>
                <div className="mt-1 text-xl font-black text-white tabular-nums">
                  {formatNumber(directRoute.total_energy_wh)} Wh
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 tabular-nums">
                  {formatNumber(directDistanceM)} m
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Enerji tasarrufu</span>
                <span className="font-black text-emerald-300 tabular-nums">
                  {formatNumber(energySavingWh)} Wh
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Tasarruf oranı</span>
                <span className="font-black text-emerald-300">
                  %{energySavingPercent.toFixed(1)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Şarj durağı</span>
                <span className="font-black text-yellow-300">
                  {optimalRoute.charging_stops.length}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-bold text-zinc-500">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Optimal
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-300" />
                Direkt
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-zinc-300" />
                Graph
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-5">
        <IstanbulClock />
      </div>
    </aside>
  );
}
