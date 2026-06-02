import type { GlobalConditions } from "@/types/route";

const WEATHER_ICONS: Record<number, string> = {
  1: "☀️",
  2: "☁️",
  3: "🌧️",
  4: "❄️",
};

const WEATHER_LABELS: Record<number, string> = {
  1: "Güneşli",
  2: "Bulutlu",
  3: "Yağmurlu",
  4: "Karlı",
};

export function getWeatherIcon(condition: number): string {
  return WEATHER_ICONS[condition] ?? "🌤️";
}

export function getWeatherLabel(condition: number): string {
  return WEATHER_LABELS[condition] ?? "Bilinmiyor";
}

export function getInitialConditions(): GlobalConditions {
  return {
    temperature: 18,
    wind_speed: 12,
    weather_condition: 2,
  };
}

export function getTrafficDensityLevel(trafficDensity: number): {
  label: "Düşük" | "Orta" | "Yüksek";
  className: string;
} {
  if (trafficDensity <= 0.33) {
    return {
      label: "Düşük",
      className: "border-green-400/30 bg-green-400/10 text-green-300",
    };
  }

  if (trafficDensity <= 0.66) {
    return {
      label: "Orta",
      className: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    };
  }

  return {
    label: "Yüksek",
    className: "border-red-400/30 bg-red-400/10 text-red-300",
  };
}
