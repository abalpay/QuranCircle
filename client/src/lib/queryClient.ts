import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

type ExtendedRequestInit = Omit<RequestInit, 'body'> & {
  body?: any
};

// Cache the CSRF token
let csrfToken: string | null = null;

// Fetch CSRF token if needed for non-GET methods
async function getCsrfToken(): Promise<string> {
  // Return cached token if available
  if (csrfToken) return csrfToken;
  
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }
    
    const data = await response.json();
    const token = data.csrfToken;
    if (typeof token !== 'string') {
      throw new Error('Invalid CSRF token received');
    }
    csrfToken = token;
    return token;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  body?: any,
  options?: Omit<ExtendedRequestInit, 'body' | 'method'>
): Promise<Response> {
  // Create a new headers object with the content type
  const headersInit: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Add any custom headers from options
  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headersInit[key] = value;
      }
    });
  }
  
  // For state-changing methods, include CSRF token
  if (method !== 'GET') {
    try {
      const token = await getCsrfToken();
      headersInit['X-CSRF-Token'] = token;
    } catch (error) {
      console.error('Failed to include CSRF token:', error);
      // Continue without token, server will reject if needed
    }
  }

  const res = await fetch(url, {
    ...options,
    method,
    headers: headersInit,
    credentials: "include",
    body: body && typeof body !== 'string' 
      ? JSON.stringify(body) 
      : body,
  });

  // If the token was invalid, clear it for next request
  if (res.status === 403 && res.headers.get('X-CSRF-Invalid') === 'true') {
    csrfToken = null;
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
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
      staleTime: 5 * 60 * 1000, // 5 minutes stale time instead of Infinity
      retry: 1, // Retry once if the request fails
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
    },
    mutations: {
      retry: 1, // Retry mutations once
      retryDelay: 1000, // 1 second delay between retries
    },
  },
});
