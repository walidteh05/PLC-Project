// Use IPv4 explicitly because the MX gateway listens on 127.0.0.1. Some
// browsers resolve localhost to IPv6 (::1), which appears as "Failed to fetch".
const API_BASE_URL = "http://127.0.0.1:5000";

export interface PlcDeviceResponse {
  device: string;
  value: number;
}

interface PlcWriteResponse extends PlcDeviceResponse {
  success: boolean;
}

export interface PlcConnectionResponse {
  connected: boolean;
  logical_station?: number;
  message?: string;
}

export interface PlcIoResponse {
  x: PlcDeviceResponse[];
  y: PlcDeviceResponse[];
}

export const IO_POINT_COUNT = 8;

const GATEWAY_OFFLINE_MESSAGE =
  "MX Gateway is not running. Stop the current dev server, then restart it with: npm run dev";

async function fetchPlc(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(GATEWAY_OFFLINE_MESSAGE);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? `PLC request failed (${response.status})`);
  }

  return data as T;
}

export async function connectPlc(): Promise<PlcConnectionResponse> {
  const response = await fetchPlc("/api/connect", { method: "POST" });

  return parseResponse<PlcConnectionResponse>(response);
}

export async function disconnectPlc(): Promise<PlcConnectionResponse> {
  const response = await fetchPlc("/api/disconnect", { method: "POST" });

  return parseResponse<PlcConnectionResponse>(response);
}

export async function readIo(): Promise<PlcIoResponse> {
  const response = await fetchPlc("/api/io", { cache: "no-store" });

  return parseResponse<PlcIoResponse>(response);
}

export async function readX0(): Promise<PlcDeviceResponse> {
  const response = await fetchPlc("/api/read", { cache: "no-store" });

  return parseResponse<PlcDeviceResponse>(response);
}

export async function writeY(
  device: string,
  value: number,
): Promise<PlcWriteResponse> {
  const response = await fetchPlc("/api/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device, value }),
  });

  return parseResponse<PlcWriteResponse>(response);
}
