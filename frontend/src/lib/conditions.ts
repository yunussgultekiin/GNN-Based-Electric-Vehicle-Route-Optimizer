import type { GlobalConditions } from "@/types/route";

export type WeatherCondition = "sunny" | "cloudy" | "rainy" | "snowy";

export type InitialConditions = {
  temperature_c: number;
  wind_speed_kmh: number;
  weather_condition: WeatherCondition;
};

export function getWeatherIcon(condition: WeatherCondition): string {
  const iconMap: Record<WeatherCondition, string> = {
    sunny: "☀️",
    cloudy: "☁️",
    rainy: "🌧️",
    snowy: "❄️",
  };

  return iconMap[condition];
}

export function getInitialConditions(): InitialConditions {
  return {
    temperature_c: 18,
    wind_speed_kmh: 12,
    weather_condition: "cloudy",
  };
}

export function mapInitialConditionsToGlobalConditions(
  conditions: InitialConditions
): GlobalConditions {
  return {
    traffic_density: 0.45,
    ambient_temperature_c: conditions.temperature_c,
    wind_speed_kmh: conditions.wind_speed_kmh,
    weather_condition:
      conditions.weather_condition === "sunny"
        ? "clear"
        : conditions.weather_condition === "rainy"
        ? "rain"
        : conditions.weather_condition === "snowy"
        ? "snow"
        : "cloudy",
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