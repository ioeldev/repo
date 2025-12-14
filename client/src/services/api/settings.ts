import { apiClient } from "./client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface LoginBackgroundResponse {
  success: boolean;
  data: {
    value: string; // base64 encoded image
  };
}

export const settingsService = {
  // Get login background image
  getLoginBackground: async (): Promise<LoginBackgroundResponse> => {
    return apiClient.get<LoginBackgroundResponse>("/settings/login-background");
  },

  // Upload login background image
  uploadLoginBackground: async (file: File): Promise<LoginBackgroundResponse> => {
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_URL}/settings/login-background`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  // Delete login background image
  deleteLoginBackground: async (): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>("/settings/login-background");
  },
};
