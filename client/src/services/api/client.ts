import type { ApiError } from "@/types/auth";
import { authService } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_URL) {
        this.baseUrl = baseUrl;
    }

    private getAuthHeader(): Record<string, string> {
        const token = localStorage.getItem("access_token");
        if (!token) {
            console.debug("[ApiClient] No access token found in localStorage");
            return {};
        }
        console.debug("[ApiClient] Using access token from localStorage");
        return {
            Authorization: `Bearer ${token}`,
        };
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.log("[ApiClient] Error:", error.message);
            if (error.message === "Token expired") {
                const refreshToken = localStorage.getItem("refresh_token");
                if (refreshToken) {
                    try {
                        const newToken = await authService.refreshToken(refreshToken);
                        localStorage.setItem("access_token", newToken.token.access_token);
                        localStorage.setItem("refresh_token", newToken.token.refresh_token);
                    } catch (refreshError) {
                        console.log("[ApiClient] Error refreshing token:", refreshError);
                        localStorage.removeItem("access_token");
                        localStorage.removeItem("refresh_token");
                        window.location.href = "/login";
                    }
                }
            }

            throw {
                message: error.message || `HTTP ${response.status}`,
                status: response.status,
                code: error.code,
            } as ApiError;
        }
        return response.json();
    }

    async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const { headers: optionHeaders, ...restOptions } = options || {};
        const finalHeaders = {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
            ...(optionHeaders as Record<string, string>),
        };
        console.debug(`[ApiClient] GET ${endpoint}`, { headers: finalHeaders });
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "GET",
            headers: finalHeaders,
            ...restOptions,
        });
        return this.handleResponse<T>(response);
    }

    async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
        const { headers: optionHeaders, ...restOptions } = options || {};
        const finalHeaders = {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
            ...(optionHeaders as Record<string, string>),
        };
        console.debug(`[ApiClient] POST ${endpoint}`, { headers: finalHeaders });
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "POST",
            headers: finalHeaders,
            body: body ? JSON.stringify(body) : undefined,
            ...restOptions,
        });
        return this.handleResponse<T>(response);
    }

    async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
        const { headers: optionHeaders, ...restOptions } = options || {};
        const finalHeaders = {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
            ...(optionHeaders as Record<string, string>),
        };
        console.debug(`[ApiClient] PUT ${endpoint}`, { headers: finalHeaders });
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "PUT",
            headers: finalHeaders,
            body: body ? JSON.stringify(body) : undefined,
            ...restOptions,
        });
        return this.handleResponse<T>(response);
    }

    async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const { headers: optionHeaders, ...restOptions } = options || {};
        const finalHeaders = {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
            ...(optionHeaders as Record<string, string>),
        };
        console.debug(`[ApiClient] DELETE ${endpoint}`, { headers: finalHeaders });
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "DELETE",
            headers: finalHeaders,
            ...restOptions,
        });
        return this.handleResponse<T>(response);
    }
}

export const apiClient = new ApiClient();
