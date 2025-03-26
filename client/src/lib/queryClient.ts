import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    
    try {
      // Try to parse the response as JSON first
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } else {
        // If not JSON, get as text
        errorMessage = await res.text() || res.statusText;
      }
    } catch (parseError) {
      // If parsing fails, use default status text
      console.warn('Error parsing response:', parseError);
      // Keep the original status text as fallback
    }
    
    throw new Error(`${res.status}: ${errorMessage}`);
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
      console.warn(`CSRF token fetch failed with status: ${response.status}`);
      // Return a fallback empty token instead of throwing
      return '';
    }
    
    const data = await response.json();
    const token = data.csrfToken;
    if (typeof token !== 'string') {
      console.warn('Invalid CSRF token received');
      return '';
    }
    csrfToken = token;
    return token;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    // Return empty token instead of throwing to prevent unhandled rejections
    return '';
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
    const token = await getCsrfToken();
    if (token) {
      headersInit['X-CSRF-Token'] = token;
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
