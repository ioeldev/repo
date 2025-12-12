import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.tsx";
import { queryClient } from "./lib/queryClient";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { BinanceWebSocketProvider } from "./contexts/BinanceWebSocketContext";
import { LiquidationWebSocketProvider } from "./contexts/LiquidationWebSocketContext";
import { TickerProvider } from "./contexts/TickerContext";

createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
            <BinanceWebSocketProvider>
                <LiquidationWebSocketProvider>
                    <TickerProvider>
                        <BrowserRouter>
                            <App />
                        </BrowserRouter>
                    </TickerProvider>
                </LiquidationWebSocketProvider>
            </BinanceWebSocketProvider>
        </CurrencyProvider>
    </QueryClientProvider>
);
