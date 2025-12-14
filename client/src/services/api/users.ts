import { apiClient } from "./client";
import type { Deposit, User, Withdraw } from "@/types/auth";

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

  // Update current user (uses /users/me endpoint with auth middleware)
  updateMe: async (data: UpdateUserRequest): Promise<User> => {
    return apiClient.post<User>("/users/me", data);
  },

  // Update user password (uses /users/password endpoint with auth middleware)
  updatePassword: async (password: string): Promise<User> => {
    return apiClient.post<User>("/users/password", { password });
  },

  // Admin: Update user by ID
  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    return apiClient.post<User>(`/users/${id}`, data);
  },

  // Admin: Update user info by ID
  updateUserInfo: async (
    id: string,
    data: UpdateUserRequest,
  ): Promise<User> => {
    return apiClient.post<User>(`/users/infos/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/users/${id}`);
  },

  // Admin actions
  impersonate: async (userId: string): Promise<ImpersonateResponse> => {
    return apiClient.post<ImpersonateResponse>(
      `/auth/impersonate/${userId}`,
      {},
    );
  },

  updateRiskLevel: async (userId: string, riskLevel: number): Promise<User> => {
    return apiClient.post<User>(`/users/${userId}`, { risk_level: riskLevel });
  },

  updateCustomMessage: async (
    userId: string,
    customMessage: string,
  ): Promise<User> => {
    return apiClient.post<User>(`/users/${userId}`, {
      custom_message: customMessage,
    });
  },

  // Balance operations
  updateBalance: async (
    userId: string,
    symbol: string,
    amount: number,
  ): Promise<User> => {
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

  // Deposit and Withdraw requests
  requestDeposit: async (
    amount: number,
    symbol: string,
  ): Promise<{ success: boolean; data: any }> => {
    return apiClient.post<{ success: boolean; data: any }>(
      "/users/deposit/request",
      {
        amount,
        symbol,
      },
    );
  },

  requestWithdraw: async (
    amount: number,
    symbol: string,
  ): Promise<{ success: boolean; data: any }> => {
    return apiClient.post<{ success: boolean; data: any }>(
      "/users/withdraw/request",
      {
        amount,
        symbol,
      },
    );
  },

  // Admin: Get all deposits and withdraws
  getAllDepositsAndWithdraws: async (): Promise<{
    success: boolean;
    data: {
      deposits: Array<Deposit & { user: User }>;
      withdraws: Array<Withdraw & { user: User }>;
    };
  }> => {
    return apiClient.get<{
      success: boolean;
      data: {
        deposits: Array<Deposit & { user: User }>;
        withdraws: Array<Withdraw & { user: User }>;
      };
    }>("/users/deposit_and_withdraw");
  },

  // Admin: Approve/Decline/Cancel deposits and withdraws
  approveDeposit: async (
    user_id: string,
    deposit_id: string,
  ): Promise<{ success: boolean; data: User }> => {
    return apiClient.post<{ success: boolean; data: User }>(
      "/users/deposit/approve",
      {
        user_id,
        deposit_id,
      },
    );
  },

  declineDeposit: async (
    user_id: string,
    deposit_id: string,
  ): Promise<{ success: boolean; data: User }> => {
    return apiClient.post<{ success: boolean; data: User }>(
      "/users/deposit/decline",
      {
        user_id,
        deposit_id,
      },
    );
  },

  cancelDeposit: async (
    user_id: string,
    deposit_id: string,
  ): Promise<{ success: boolean; data: User }> => {
    return apiClient.post<{ success: boolean; data: User }>(
      "/users/deposit/cancel",
      {
        user_id,
        deposit_id,
      },
    );
  },

  approveWithdraw: async (
    user_id: string,
    withdraw_id: string,
  ): Promise<{ success: boolean; data: User }> => {
    return apiClient.post<{ success: boolean; data: User }>(
      "/users/withdraw/approve",
      {
        user_id,
        withdraw_id,
      },
    );
  },

  declineWithdraw: async (
    user_id: string,
    withdraw_id: string,
  ): Promise<{ success: boolean; data: User }> => {
    return apiClient.post<{ success: boolean; data: User }>(
      "/users/withdraw/decline",
      {
        user_id,
        withdraw_id,
      },
    );
  },

  cancelWithdraw: async (
    user_id: string,
    withdraw_id: string,
  ): Promise<{ success: boolean; data: User }> => {
    return apiClient.post<{ success: boolean; data: User }>(
      "/users/withdraw/cancel",
      {
        user_id,
        withdraw_id,
      },
    );
  },
};
