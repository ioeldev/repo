import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authService,
  type LoginRequest,
  type LoginResponse,
  type SignupRequest,
  type SignupResponse,
} from "@/services/api";
import { useNavigate } from "react-router";

export const useLogin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data: LoginResponse) => {
      try {
        // Validate response data
        if (!data.token || !data.user) {
          throw new Error(
            "Invalid login response: missing access_token or user",
          );
        }

        const { access_token, refresh_token } = data.token;

        // Store ONLY tokens in localStorage
        // User data will be fetched from server when needed (via useGetMe)
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token || "");

        // Verify storage was successful
        const storedToken = localStorage.getItem("access_token");
        if (!storedToken) {
          throw new Error("Failed to store access token in localStorage");
        }

        // Clear any stale query cache from previous user
        // This prevents cache conflicts when switching between users
        queryClient.clear();

        console.log("Login successful, user role:", data.user.role);

        // Redirect based on role
        if (["admin", "superadmin"].includes(data.user.role)) {
          navigate("/admin/users");
        } else {
          navigate("/");
        }
      } catch (storageError) {
        console.error("Storage error:", storageError);
      }
    },
    onError: (error) => {
      console.error("Login error:", error);
    },
  });
};

export const useSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignupRequest) => authService.signup(data),
    onSuccess: () => {
      // Invalidate users query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      console.error("Signup error:", error);
    },
  });
};

export const useGetMe = (enabled: boolean = true) => {
  const token = localStorage.getItem("access_token");

  return useQuery({
    queryKey: ["me"],
    queryFn: () => {
      if (!token) throw new Error("No token available");
      return authService.getMe();
    },
    enabled: enabled && !!token,
    retry: 1,
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return () => {
    // Clear auth token and user data from localStorage
    authService.logout();

    // Invalidate all queries to clear cached user data
    // This prevents stale data when logging in as a different user
    queryClient.invalidateQueries({ queryKey: ["me"] });
    queryClient.clear();

    // Redirect to login
    navigate("/login");
  };
};

// ============ User Role Checks ============

/**
 * Check if user is admin or superadmin
 * Fetches from server, cached by TanStack Query
 *
 * Example:
 * const isAdmin = useIsAdmin();
 */
export const useIsAdmin = () => {
  const { data: me } = useGetMe(true);
  return ["admin", "superadmin"].includes(me?.data?.user?.role || "");
};

/**
 * Check if user is superadmin
 * Fetches from server, cached by TanStack Query
 *
 * Example:
 * const isSuperAdmin = useIsSuperAdmin();
 */
export const useIsSuperAdmin = () => {
  const { data: me } = useGetMe(true);
  return me?.data?.user?.role === "superadmin";
};

/**
 * Check if user is regular user
 * Fetches from server, cached by TanStack Query
 *
 * Example:
 * const isUser = useIsRegularUser();
 */
export const useIsRegularUser = () => {
  const { data: me } = useGetMe(true);
  return me?.data?.user?.role === "user";
};

// ============ User Permissions Hook ============
/**
 * Convenient hook to check multiple user permissions at once
 * Always fetches from server (single source of truth)
 * Cached by TanStack Query (5 minute stale time)
 *
 * Returns an object with boolean flags for different roles
 *
 * Example:
 * const { isAdmin, isSuperAdmin, isUser, user, isLoading } = useUserPermissions();
 */
export const useUserPermissions = () => {
  const { data: me, isLoading, error } = useGetMe(true);
  const user = me?.data?.user;
  const role = user?.role || "";

  return {
    user,
    isLoading,
    error,
    isAdmin: ["admin", "superadmin"].includes(role),
    isSuperAdmin: role === "superadmin",
    isUser: role === "user",
    isAuthenticated: !!user,
    role,
  };
};

// ============ User Info Hook ============
/**
 * Get current user info with convenient formatting
 * Always fetches from server (single source of truth)
 * Cached by TanStack Query (5 minute stale time)
 *
 * Returns user data pre-formatted for display
 *
 * Example:
 * const { fullName, email, avatar, role } = useUserInfo();
 */
export const useUserInfo = () => {
  const { data: me, isLoading, error } = useGetMe(true);
  const user = me?.data?.user;

  return {
    user,
    isLoading,
    error,
    id: user?._id,
    email: user?.email || "",
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    fullName: `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
    role: user?.role || "user",
    phone: user?.phone || "",
    // Balance info
    totalBalance: (user?.balances || []).reduce((sum, b) => sum + b.balance, 0),
    balances: user?.balances || [],
    robotsBalance: user?.robots_balance || 0,
    investBalance: user?.invest_balance || 0,
    // Account info
    riskLevel: user?.risk_level || 0,
    maxLeverage: user?.max_leverage || 0,
    lastLogin: user?.last_login,
  };
};

// ============ User Balance Hook ============
/**
 * Get user balance information
 * Always fetches from server (single source of truth)
 * Cached by TanStack Query (5 minute stale time)
 *
 * Example:
 * const { totalBalance, robotsBalance, investBalance, getBalance } = useUserBalance();
 */
export const useUserBalance = () => {
  const { data: me, isLoading, error } = useGetMe(true);
  const user = me?.data?.user;
  const balances = user?.balances || [];

  const getBalance = (symbol: string) => {
    return balances.find((b) => b.symbol === symbol)?.balance || 0;
  };

  const getTotalBalance = () => {
    return balances.reduce((sum, b) => sum + b.balance, 0);
  };

  return {
    user,
    isLoading,
    error,
    balances,
    robotsBalance: user?.robots_balance || 0,
    investBalance: user?.invest_balance || 0,
    totalBalance: getTotalBalance(),
    getBalance,
    currencies: balances.map((b) => b.symbol),
  };
};
