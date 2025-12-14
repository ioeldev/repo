import { apiClient } from "./client";
import type { LoginRequest, LoginResponse, GetMeResponse, RefreshTokenRequest, DashboardSummaryResponse, SignupRequest, SignupResponse } from "@/types/auth";

export const authService = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        return apiClient.post<LoginResponse>("/auth/login", credentials);
    },

    signup: async (data: SignupRequest): Promise<SignupResponse> => {
        return apiClient.post<SignupResponse>("/auth/signup", data);
    },

    getMe: async (): Promise<GetMeResponse> => {
        return apiClient.get<GetMeResponse>("/auth/me");
    },

    getDashboardSummary: async (): Promise<DashboardSummaryResponse> => {
        return apiClient.get<DashboardSummaryResponse>("/auth/me/dashboard-summary");
    },

    refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
        const payload: RefreshTokenRequest = { refresh_token: refreshToken };
        return apiClient.post<LoginResponse>("/auth/refresh_token", payload);
    },

    logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
    },
};
