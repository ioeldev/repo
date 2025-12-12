import { apiClient } from "./client";
import type { User } from "@/types/auth";

interface CreateUserRequest {
    email: string;
    name: string;
    password?: string;
    role: "user" | "admin" | "superadmin";
}

export type UpdateUserRequest = Partial<User>;

interface ImpersonateResponse {
    success: boolean;
    data: {
        token: {
            access_token: string;
            refresh_token: string;
        };
        user: User;
    };
}

export const usersService = {
    getAll: async (): Promise<User[]> => {
        return apiClient.get<User[]>("/users");
    },

    getById: async (id: string): Promise<User> => {
        return apiClient.get<User>(`/users/${id}`);
    },

    create: async (data: CreateUserRequest): Promise<User> => {
        return apiClient.post<User>("/users", data);
    },

    update: async (id: string, data: UpdateUserRequest): Promise<User> => {
        return apiClient.post<User>(`/users/${id}`, data);
    },

    delete: async (id: string): Promise<void> => {
        return apiClient.delete(`/users/${id}`);
    },

    // Admin actions
    impersonate: async (userId: string): Promise<ImpersonateResponse> => {
        return apiClient.post<ImpersonateResponse>(`/auth/impersonate/${userId}`, {});
    },

    updateRiskLevel: async (userId: string, riskLevel: number): Promise<User> => {
        return apiClient.post<User>(`/users/${userId}`, { risk_level: riskLevel });
    },

    updateCustomMessage: async (userId: string, customMessage: string): Promise<User> => {
        return apiClient.post<User>(`/users/${userId}`, { custom_message: customMessage });
    },

    // Balance operations
    updateBalance: async (userId: string, symbol: string, amount: number): Promise<User> => {
        if (symbol === "ROBOT") {
            return apiClient.post<User>(`/users/robot_balance`, {
                user_id: userId,
                amount,
            });
        } else if (symbol === "INVEST") {
            return apiClient.post<User>(`/users/invest_balance`, {
                user_id: userId,
                amount,
            });
        } else {
            return apiClient.post<User>(`/users/balance/${symbol}`, {
                user_id: userId,
                amount,
            });
        }
    },
};
