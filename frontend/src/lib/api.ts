import * as mockApi from "@/lib/mock_api";

import type {
  DemoGraph,
  RouteRequest,
  RouteResponse,
} from "@/types/route";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

async function requestJson<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchOptimalRoute(
  request: RouteRequest
): Promise<RouteResponse> {
  if (USE_MOCK_API) {
    return mockApi.fetchOptimalRoute(request);
  }

  return requestJson<RouteResponse>("/route/optimal", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchDirectRoute(
  request: RouteRequest
): Promise<RouteResponse> {
  if (USE_MOCK_API) {
    return mockApi.fetchDirectRoute(request);
  }

  return requestJson<RouteResponse>("/route/direct", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchDemoGraph(): Promise<DemoGraph> {
  if (USE_MOCK_API) {
    return mockApi.fetchDemoGraph();
  }

  return requestJson<DemoGraph>("/demo/graph", {
    method: "GET",
  });
}