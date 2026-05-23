import { API_BASE_URL as CONFIGURED_API_BASE_URL } from "../config/domain";
import { store } from "../store/store";

/** Override for local dev: EXPO_PUBLIC_API_URL=http://localhost:4000/api */
export const API_BASE_URL =
  (typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_API_URL?.replace(/\/$/, "")) ||
  CONFIGURED_API_BASE_URL;
function parseErrorBody(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) return `API error ${status}`;
  try {
    const j = JSON.parse(trimmed) as {
      error?: string;
      message?: string;
      code?: string;
      detail?: string;
    };
    if (typeof j.error === "string" && j.error.length) {
      const suffix =
        typeof j.code === "string" && j.code.length
          ? ` (${j.code}${typeof j.detail === "string" && j.detail.length ? `: ${j.detail}` : ""})`
          : "";
      return j.error + suffix;
    }
    if (typeof j.message === "string" && j.message.length) return j.message;
  } catch {
    // not JSON
  }
  return trimmed.length > 300 ? `${trimmed.slice(0, 297)}...` : trimmed;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = store.getState().auth.token;
  const method = (init?.method ?? "GET").toUpperCase();
  const isGet = method === "GET";
  const fetchInit: RequestInit & { cache?: "default" | "no-store" | "reload" } = {
    ...init,
    ...(isGet ? { cache: "no-store" as const } : {}),
    headers: {
      "Content-Type": "application/json",
      ...(isGet ? { "Cache-Control": "no-cache", Pragma: "no-cache" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  };
  const response = await fetch(`${API_BASE_URL}${path}`, fetchInit);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseErrorBody(text, response.status));
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
};

