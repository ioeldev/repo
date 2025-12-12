// ============ Auth Types ============
export interface LoginRequest {
    email: string;
    password: string;
}

export interface Token {
    access_token: string;
    refresh_token: string;
}

export interface LoginResponse {
    token: Token;
    user: User;
}

export interface GetMeResponse {
    success: boolean;
    data: {
        user: User;
        token: Token;
    };
}

export interface RefreshTokenRequest {
    refresh_token: string;
}

export interface ApiError {
    message: string;
    status?: number;
    code?: string;
}

// ============ User & Related Types ============
export type Balance = {
    name: string;
    symbol: string;
    balance: number;
};

export type Deposit = {
    _id: string;
    amount: number;
    symbol: string;
    date: string;
    status: "pending" | "approved" | "declined" | "canceled";
};

export type Withdraw = Deposit;

export type JoinedRobot = {
    robot_id: string;
    joined_at: string;
    balance: number;
    initial_balance: number;
};

export type JoinedProduct = {
    _id: string;
    product_id: string;
    joined_at: string;
    balance: number;
    initial_balance: number;
    duration: number;
};

export type RobotsRequest = {
    created_at: string;
    robot_id: string;
    requested_amount: number;
    type: "add_funds" | "join";
};

export type InvestRequest = {
    _id: string;
    created_at: string;
    product_id: string;
    requested_amount: number;
    type: "add_funds" | "invest";
};

export type Address = {
    address: string;
    postal_code: string;
    city: string;
    country: string;
};

export type Message = {
    _id?: string;
    from: string;
    to: string;
    message: string;
    date?: Date;
    is_opened?: boolean;
};

export type User = {
    _id: string;
    created_at?: number;
    updated_at?: number;
    email: string;
    password?: string;
    first_name: string;
    last_name: string;
    address: Address;
    role: "user" | "admin" | "superadmin";
    phone: string;
    balances: Balance[];
    joined_robots: JoinedRobot[];
    robots_requests: RobotsRequest[];
    robots_balance: number;
    joined_products: JoinedProduct[];
    invest_requests: InvestRequest[];
    invest_balance: number;
    deposits: Deposit[];
    withdraws: Withdraw[];
    risk_level: number;
    assigned_to?: string;
    last_login?: Date;
    tokenVersion: number;
    messages: Message[];
    custom_message?: string;
    bank_info?: {
        account_holder: string;
        iban: string;
        bic: string;
    };
    fee_percentage?: number;
    max_leverage?: number;
};

// ============ Trading Types ============
export type Position = {
    _id: string;
    created_at?: Date;
    updated_at?: Date;
    user: User;
    symbol: string;
    manual_symbol: string;
    base_currency: string;
    base_currency_amount: number;
    quantity: number;
    entry_price: number;
    entry_time: Date;
    exit_price?: number;
    exit_time?: Date;
    status: "open" | "closed";
    type: "buy" | "sell";
    leverage: number;
    liquidation_price: number;
    position_size: number;
    liquidated?: boolean;
    take_profit?: number;
    stop_loss?: number;
    fees?: number;
};

// ============ Robot Types ============
export type Robot = {
    _id: string;
    created_at?: Date;
    updated_at?: Date;
    name: string;
    month_duration: number;
    apy: number;
    min_entry_price: number;
    max_entry_price: number;
    level_bg: "gold" | "silver" | "bronze" | "black";
};

export type RobotEarning = {
    _id: string;
    robot_id: string;
    robot_name: string;
    user_id: string;
    amount: number;
    date: Date;
};

// ============ Investment Types ============
export const FREQUENCY_VALUES = {
    DAILY: "daily",
    MONTHLY: "monthly",
    TRIMESTRAL: "trimestral",
    ANNUAL: "annual",
} as const;

export type Frequency = (typeof FREQUENCY_VALUES)[keyof typeof FREQUENCY_VALUES];

export type InterestLevel = {
    from_amount: number;
    to_amount: number;
    interest_rate: number;
};

export type InvestProduct = {
    _id: string;
    category: string;
    title: string;
    subtitle: string;
    description: string;
    minimum_investment: number;
    maximum_investment: number;
    unit_price: number;
    total_units: number;
    interest_rate: number;
    frequency: Frequency;
    end_date: Date;
    confidence: number;
    duration: number; // in months
    created_at?: Date;
    updated_at?: Date;
    interest_levels: InterestLevel[];
    image: string;
    allowed_users?: string[];
};

export type InvestEarning = {
    _id: string;
    product_id: string;
    joined_product_id: string;
    user_id: string;
    amount: number;
    date: Date;
};

export const INVEST_PRODUCT_CATEGORY_VALUES = {
    LIVRET: "savingFunds",
    BOURSE: "bourse",
    REALESTATE: "realEstate",
    PARKING: "parking",
    STUDENT: "students",
} as const;

export type InvestProductCategory =
    (typeof INVEST_PRODUCT_CATEGORY_VALUES)[keyof typeof INVEST_PRODUCT_CATEGORY_VALUES];

// ============ Dashboard Summary Types ============
export interface DashboardWallet {
    btc: number;
    usdt: number;
    eur: number;
    total_in_usd: number;
}

export interface DashboardTrading {
    balance: number;
    open_pnl: number;
    closed_pnl: number;
    fees_paid: number;
    total_balance: number;
}

export interface DashboardRobots {
    balance: number;
    earnings: number;
    total_balance: number;
}

export interface DashboardInvestments {
    balance: number;
    earnings: number;
    total_balance: number;
}

export interface DashboardAllocation {
    trading: number;
    robots: number;
    investments: number;
}

export interface DashboardPortfolio {
    total_balance: number;
    total_performance: number;
    allocation: DashboardAllocation;
}

export interface DashboardSummary {
    wallet: DashboardWallet;
    trading: DashboardTrading;
    robots: DashboardRobots;
    investments: DashboardInvestments;
    portfolio: DashboardPortfolio;
    currency?: "USD" | "EUR";
}

export interface DashboardSummaryResponse {
    success: boolean;
    data: {
        user: User;
        token: Token;
        summary: DashboardSummary;
    };
}

export type FetchPairsResponse = PairInfo[];

export interface PairInfo {
    name: string;
    pair: string;
    price: string;
    change: string;
    volume: string;
}
