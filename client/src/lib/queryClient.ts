import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getIdToken } from "./firebase-auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // If unauthorized, clear any stored tokens
    if (res.status === 401) {
      // Clear any stored JWT tokens (for backward compatibility)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get Firebase ID token for authentication
async function getAuthToken(): Promise<string | null> {
  try {
    console.log('🔐 Getting Firebase ID token...');
    const token = await getIdToken();
    console.log('🔐 Token retrieved:', token ? 'Yes' : 'No');
    if (token) {
      console.log('🔐 Token length:', token.length);
      console.log('🔐 Token preview:', token.substring(0, 20) + '...');
    }
    return token;
  } catch (error) {
    console.error('🔐 Error getting auth token:', error);
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add authorization header if token exists
  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Use relative URL for API requests
  const fullUrl = url.startsWith('http') ? url : url;

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Only remove token on 401 if it's a real authentication failure
  if (res.status === 401) {
    // Clear any stored JWT tokens (for backward compatibility)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add authorization header if token exists
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Use relative URL for API requests
    const url = queryKey[0] as string;
    
    // Handle URL encoding for asset symbols in API paths
    let fullUrl = url;
    if (url.includes('/api/assets/') || url.includes('/api/sentiment/')) {
      // Extract the path parts and encode the symbol part
      const urlParts = url.split('/');
      if (urlParts.length >= 4) {
        // For /api/assets/symbol or /api/sentiment/symbol, the symbol is at index 3
        const symbolIndex = 3;
        if (urlParts[symbolIndex]) {
          urlParts[symbolIndex] = encodeURIComponent(urlParts[symbolIndex]);
          fullUrl = urlParts.join('/');
        }
      }
    }

    const res = await fetch(fullUrl, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error('API request failed:', res.status, text);
      throw new Error(`${res.status}: ${text}`);
    }

    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 401 or 403
        if (error.message.includes('401') || error.message.includes('403')) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
