import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { I18nextProvider } from "react-i18next";
import "./index.css";
import "./i18n/config";
import i18n from "./i18n/config";
import App from "./App.tsx";
import { queryClient } from "./lib/queryClient";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { BinanceWebSocketProvider } from "./contexts/BinanceWebSocketContext";
import { LiquidationWebSocketProvider } from "./contexts/LiquidationWebSocketContext";
import { TickerProvider } from "./contexts/TickerContext";

createRoot(document.getElementById("root")!).render(
    <I18nextProvider i18n={i18n}>
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
    </I18nextProvider>
);
