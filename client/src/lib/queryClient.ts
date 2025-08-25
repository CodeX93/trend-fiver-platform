import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // If unauthorized, clear the token
    if (res.status === 401) {
      localStorage.removeItem('authToken');
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token is expired, remove it
          localStorage.removeItem('authToken');
          return null;
        }
      } catch (error) {
        // Invalid token, remove it
        localStorage.removeItem('authToken');
        return null;
      }
    }
    return token;
  }
  return null;
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
  const token = getAuthToken();
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
    // Check if the token is actually expired or invalid
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token is actually expired, remove it
          localStorage.removeItem('authToken');
        }
      } catch (error) {
        // Invalid token format, remove it
        localStorage.removeItem('authToken');
      }
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
    const token = getAuthToken();
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
