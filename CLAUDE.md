# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack TypeScript trading/investment platform with a React frontend and Express backend that integrates with Binance and other exchanges. The application supports user positions tracking, robot-based trading, investment products, and real-time WebSocket data feeds.

## Monorepo Structure

```
repo/
├── backend/     # Express.js API
└── client/      # React SPA with Vite
```

Both projects use **pnpm** as the package manager.

## Backend Architecture

### Technology Stack
- **Runtime**: Node.js 20.x with TypeScript (CommonJS)
- **Framework**: Express.js
- **Database**: MongoDB (native driver, no ORM)
- **Deployment**: AWS Lambda via Serverless Framework
- **Real-time**: WebSocket server (port 3334)
- **Authentication**: JWT with token versioning

### Key Components

**Models** (`src/models/`)
- Direct MongoDB collection access pattern (no ODM)
- Each model exports static methods for CRUD operations
- Models: users, positions, robots, robots_earnings, investment_products, invest_earnings, settings

**Routes** (`src/routes/`)
- Organized by domain (users, positions, auth, mexc, binance, robots, etc.)
- Two position APIs: `/positions` (v1) and `/positions/v2`

**Middlewares** (`src/middlewares.ts`)
- `auth`: Validates JWT and attaches user to request
- `onlyAdmin`: Restricts access to superadmin/admin roles
- Token versioning prevents use of invalidated tokens

**Workers** (`src/workers/`)
- `binance.worker.ts`: WebSocket feed for Binance data

**Lambda Functions** (`src/lambdas/`)
- `robotsRewards`: Scheduled daily at 11 PM UTC (cron job)
- `emailSender`: Email notifications handler

### Development Commands

```bash
cd backend

# Development
pnpm dev                    # Run local server with nodemon (port from .env)
pnpm dev:liquidation        # Run liquidation server

# Build & Deploy
pnpm build                  # Compile TypeScript + copy non-code files
pnpm start                  # Run production server
pnpm start:liquidation      # Run production liquidation server

# Serverless Deployment
pnpm deploy:capi           # Deploy to 'capi' stage
pnpm deploy:capi-old       # Deploy to 'capi-old' stage
pnpm deploy:inter          # Deploy to 'inter' stage
```

### Environment Variables
Backend requires `.env` file with:
- `MONGO_URI`: MongoDB connection string
- `DB_NAME`: Database name
- `JWT_SECRET`: Secret for JWT signing
- `PORT`: Server port (default 3333)

### Database Patterns

The codebase uses **direct MongoDB collections** without an ORM:
- Models define TypeScript types and static methods
- Collections accessed via `db.collection('collection_name')`
- Use `ObjectId` from mongodb package for ID operations
- Index creation happens in `src/index.ts` on startup (e.g., robots_earnings unique index)

## Frontend Architecture

### Technology Stack
- **Framework**: React 19 with TypeScript (ESM)
- **Build Tool**: Vite
- **Routing**: React Router 7
- **State Management**: React Query (TanStack Query)
- **Styling**: Tailwind CSS 4 + Radix UI primitives
- **Real-time**: WebSocket contexts for Binance and liquidation data
- **i18n**: i18next with react-i18next (English/French)

### Project Structure

**Pages** (`src/pages/`)
- `user/`: User-facing pages (dashboard, trading, positions, settings)
- `admin/`: Admin pages (users, positions, deposits-withdraws, robots, settings)
- `login/`: Authentication

**Layouts** (`src/layouts/`)
- `user-layout.tsx`: Layout for regular users
- `admin-layout.tsx`: Layout for admin panel

**Components** (`src/components/`)
- `ui/`: Reusable UI components (shadcn/ui style)
- `admin/`: Admin-specific components
- `user/`: User-specific components
- `ProtectedRoutes.tsx`: Auth guard for user routes
- `AdminProtectedRoutes.tsx`: Auth guard for admin routes
- `ImpersonationManager.tsx`: Admin user impersonation system

**Contexts** (`src/contexts/`)
- `CurrencyContext`: Currency selection and conversion
- `BinanceWebSocketContext`: Real-time Binance data
- `LiquidationWebSocketContext`: Real-time liquidation data
- `TickerContext`: Ticker/price data

**Services** (`src/services/api/`)
- API client functions using fetch/axios
- Centralized API endpoint configuration

### Development Commands

```bash
cd client

# Development
pnpm dev          # Start dev server on port 5174
pnpm build        # TypeScript check + Vite build
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
```

### Environment Variables
Client requires `.env` file with:
- `VITE_API_URL`: Backend API URL (e.g., http://localhost:3333)
- `VITE_WS_HOST`: WebSocket host for Binance feed
- `VITE_LIQUIDATION_WS_HOST`: WebSocket host for liquidations

### Styling System

**Tailwind CSS 4** with custom theme:
- Path alias: `@/*` maps to `src/*`
- Theme variables defined in `src/index.css` using CSS custom properties
- Light/dark theme support via `next-themes`
- Uses `@theme inline` blocks to map semantic tokens to Tailwind
- OKLCH color space for better color consistency

**Component Library**:
- Radix UI primitives for accessible components
- Custom UI components in `src/components/ui/`
- Follow shadcn/ui patterns (composition-based, customizable)

## Authentication Flow

1. User logs in via `/auth` endpoint → receives JWT
2. JWT contains: `_id`, `role`, `tokenVersion`
3. Frontend stores token in localStorage/sessionStorage
4. Backend middleware validates token + checks tokenVersion against DB
5. Token invalidation: increment user's `tokenVersion` field
6. Admin impersonation: Separate token system with visual banner

## WebSocket Architecture

Two WebSocket servers:
1. **Binance Worker** (port 3334): Real-time market data from Binance
2. **Liquidation Server**: Separate liquidation event stream

Frontend connects via context providers and distributes data to components.

## Important Development Notes

### Backend
- Use `tsc-alias` for path resolution after TypeScript compilation
- Serverless deployment excludes AWS SDK to reduce bundle size
- Lambda timeout is 15s for API, 10s for scheduled functions
- MongoDB connection is established once on server startup
- All dates use `moment-timezone` with Europe/Paris as default

### Frontend
- React Compiler plugin enabled (babel-plugin-react-compiler)
- Virtual scrolling for large tables via `@tanstack/react-virtual`
- TradingView widgets integration for charts
- Multiple index.css variants exist (index.css, index.binance.css, index.twitter.css)
- Use React Query for all server state management
- i18n translations in `src/i18n/locales/`

### Common Patterns
- **Error Handling**: Express routes should catch errors and return appropriate status codes
- **Authorization**: Use `auth` middleware for authenticated routes, `onlyAdmin` for admin-only
- **API Versioning**: Maintain backward compatibility or create v2 endpoints (like positions/v2)
- **Component Styling**: Prefer Tailwind utilities over custom CSS
- **Type Safety**: Define TypeScript types for all data structures
