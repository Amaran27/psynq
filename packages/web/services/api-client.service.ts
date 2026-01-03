/**
 * API Client Service
 * 
 * Provides a centralized HTTP client with automatic token refresh and retry logic.
 * Follows hexagonal architecture principles by acting as an adapter for HTTP communication.
 * 
 * Features:
 * - Automatic Bearer token injection
 * - Token refresh on 401 responses
 * - Request retry after successful token refresh
 * - Centralized error handling
 */

interface ApiRequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  statusCode: number;
}

export class ApiClientService {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_API_URL) {
      // Use environment variable if available (set by Next.js)
      this.baseUrl = (window as any).NEXT_PUBLIC_API_URL;
    } else if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      this.baseUrl = `${protocol}//${hostname}:3001`;
    } else {
      this.baseUrl = 'http://127.0.0.1:3001';
    }
  }

  /**
   * Make an authenticated API request with automatic token refresh
   */
  async request<T = any>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      requiresAuth = true,
    } = config;

    // Build request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add auth token if required
    let token = null;
    if (requiresAuth) {
      token = this.getToken();
      if (!token) {
        return {
          error: 'No authentication token available',
          statusCode: 401,
        };
      }
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Build request config
    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body) {
      requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, requestConfig);

      // Handle 401 - try to refresh token
      if (response.status === 401 && requiresAuth) {
        const newToken = await this.handleTokenRefresh();
        if (newToken) {
          // Retry request with new token
          return this.request<T>(endpoint, {
            ...config,
            headers: {
              ...headers,
              'Authorization': `Bearer ${newToken}`,
            },
          });
        }
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return {
          error: errorData.message || errorData.error || 'Request failed',
          statusCode: response.status,
        };
      }

      // Parse successful response
      const data = await response.json();
      return {
        data,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        statusCode: 0,
      };
    }
  }

  /**
   * Handle token refresh with locking to prevent multiple refresh attempts
   */
  private async handleTokenRefresh(): Promise<string | null> {
    // If already refreshing, subscribe to the refresh completion
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token: string) => {
          resolve(token);
        });
      });
    }

    // Start refresh process
    this.isRefreshing = true;

    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        this.clearTokens();
        this.notifyRefreshSubscribers(null);
        return null;
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        this.notifyRefreshSubscribers(null);
        return null;
      }

      const data = await response.json();
      const { accessToken, refreshToken: newRefreshToken } = data;

      // Store new tokens
      this.setTokens(accessToken, newRefreshToken);

      // Notify all subscribers
      this.notifyRefreshSubscribers(accessToken);

      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      this.notifyRefreshSubscribers(null);
      return null;
    } finally {
      this.isRefreshing = false;
      this.refreshSubscribers = [];
    }
  }

  /**
   * Notify all subscribers waiting for token refresh
   */
  private notifyRefreshSubscribers(token: string | null): void {
    this.refreshSubscribers.forEach((callback) => callback(token!));
  }

  /**
   * Get stored access token
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('jwt_token');
  }

  /**
   * Get stored refresh token
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  /**
   * Store new tokens
   */
  private setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('jwt_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    
    // Dispatch storage event for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'jwt_token',
      newValue: accessToken,
    }));
  }

  /**
   * Clear stored tokens
   */
  private clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('refresh_token');
  }

  /**
   * Convenience method for GET requests
   */
  async get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  /**
   * Convenience method for POST requests
   */
  async post<T = any>(
    endpoint: string,
    body: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  /**
   * Convenience method for PUT requests
   */
  async put<T = any>(
    endpoint: string,
    body: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  /**
   * Convenience method for DELETE requests
   */
  async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

// Singleton instance
let apiClientInstance: ApiClientService | null = null;

export const getApiClient = (): ApiClientService => {
  if (!apiClientInstance) {
    apiClientInstance = new ApiClientService();
  }
  return apiClientInstance;
};
