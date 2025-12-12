export { apiClient } from "./client";
export { authService } from "./auth";
export { usersService } from "./users";
export { positionsService } from "./positions";
export { binanceService } from "./binance";
export type {
    PnLHistoryDataPoint,
    PnLHistoryResponse,
    Position,
    AdminPosition,
    PositionsResponse,
    AdminPositionsResponse,
    PaginationMeta,
    CreatePositionPayload,
    CreatePositionResponse,
    ClosePositionPayload,
    ClosePositionResponse,
    AdminPositionsParams,
    AdminPositionsFilters,
    UpdatePositionPayload,
    DeletePositionResponse,
} from "./positions";

// Export all types and constants
export { FREQUENCY_VALUES, INVEST_PRODUCT_CATEGORY_VALUES } from "@/types/auth";

export type {
    // Auth
    LoginRequest,
    LoginResponse,
    GetMeResponse,
    RefreshTokenRequest,
    Token,
    ApiError,
    // User & Related
    User,
    Address,
    Balance,
    Deposit,
    Withdraw,
    JoinedRobot,
    JoinedProduct,
    RobotsRequest,
    InvestRequest,
    Message,
    // Robots
    Robot,
    RobotEarning,
    // Investments
    InvestProduct,
    InvestEarning,
    InvestProductCategory,
    Frequency,
    InterestLevel,
    // Dashboard Summary
    DashboardSummary,
    DashboardSummaryResponse,
    DashboardWallet,
    DashboardTrading,
    DashboardRobots,
    DashboardInvestments,
    DashboardPortfolio,
    DashboardAllocation,
    // Binance
    FetchPairsResponse,
} from "@/types/auth";
