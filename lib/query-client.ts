import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import Constants from "expo-constants";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
/**
 * Gets the base URL for the Express API server (e.g., "http://192.168.1.5:5000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // If a specific domain is set (e.g. for production), use it
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }

  // running in expo go
  // manifest.debuggerHost is deprecated, use hostUri
  // @ts-ignore
  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const [ip] = hostUri.split(':');
    return `http://${ip}:5000`;
  }

  // fallback for web/simulator if no hostUri
  return "http://localhost:5000";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      "Bypass-Tunnel-Reminder": "true",
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const baseUrl = getApiUrl();
      const url = new URL(queryKey.join("/") as string, baseUrl);

      const res = await fetch(url.toString(), {
        credentials: "include",
        headers: {
          "Bypass-Tunnel-Reminder": "true",
        },
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
