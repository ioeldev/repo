"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePairs } from "@/hooks/usePairs";
import { TradingProvider } from "@/contexts/TradingContext";
import { TradingFormProvider } from "@/contexts/TradingFormContext";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Orderbook, TradeForm, TradingChart, MarketSelector, PositionsTabs } from "@/components/trading";
import { useIsMobile } from "@/hooks/use-mobile";

export function TradingContent() {
    const { t } = useTranslation();
    const { pairs } = usePairs();
    const [activeTopTab, setActiveTopTab] = useState<"trade" | "chart">("trade");
    const isMobile = useIsMobile();

    if (!pairs || pairs.length === 0) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <span className="text-sm text-muted-foreground">{t("user.pages.trading.loadingTradingData")}</span>
            </div>
        );
    }

    return (
        <TradingProvider pairs={pairs}>
            <TradingFormProvider>
                <div className="h-screen flex flex-col">
                    {/* Market Selector Bar - Always visible at top */}
                    <MarketSelector />

                    {/* Main Trading Layout */}
                    <ResizablePanelGroup direction="vertical" className="flex-1">
                        {/* Top Section - Responsive Trading/Chart */}
                        <ResizablePanel defaultSize={80} minSize={40}>
                            <div className="w-full h-full">
                                {/* Desktop Layout - Hidden on Mobile */}
                                <div className="hidden md:block w-full h-full">
                                    <ResizablePanelGroup direction="horizontal" className="h-full">
                                        {/* Left Panel - Orderbook */}
                                        <ResizablePanel
                                            defaultSize={15}
                                            minSize={15}
                                            maxSize={25}
                                            className="min-w-[240px]"
                                        >
                                            <div className="flex flex-col h-full">
                                                <Orderbook />
                                            </div>
                                        </ResizablePanel>

                                        <ResizableHandle />

                                        {/* Center Panel - Trading Chart */}
                                        <ResizablePanel defaultSize={55} minSize={35}>
                                            <TradingChart />
                                        </ResizablePanel>

                                        <ResizableHandle />

                                        {/* Right Panel - Trade Form */}
                                        <ResizablePanel defaultSize={25} minSize={15}>
                                            <TradeForm />
                                        </ResizablePanel>
                                    </ResizablePanelGroup>
                                </div>

                                {/* Mobile Layout - Tabs */}
                                {isMobile && (
                                    <div className="md:hidden w-full h-full flex flex-col bg-card">
                                        {/* Tab Navigation */}
                                        <div className="flex border-b border-border flex-shrink-0">
                                            <button
                                                onClick={() => setActiveTopTab("trade")}
                                                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                                                    activeTopTab === "trade"
                                                        ? "border-b-2 border-primary text-primary"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                {t("user.pages.trading.trade")}
                                            </button>
                                            <button
                                                onClick={() => setActiveTopTab("chart")}
                                                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                                                    activeTopTab === "chart"
                                                        ? "border-b-2 border-primary text-primary"
                                                        : "text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                {t("user.pages.trading.chart")}
                                            </button>
                                        </div>

                                        {/* Tab Content - Chart always mounted, Orderbook conditionally rendered */}
                                        <div className="flex-1 w-full overflow-hidden relative">
                                            {/* Trade Tab - Conditionally rendered to avoid duplicate subscriptions */}
                                            {activeTopTab === "trade" && (
                                                <div className="w-full h-full flex flex-row overflow-hidden">
                                                    <Orderbook />
                                                    <TradeForm />
                                                </div>
                                            )}

                                            {/* Chart Tab - Always mounted, hidden with CSS to prevent widget rerender */}
                                            <div
                                                className={`w-full h-full absolute inset-0 transition-opacity ${
                                                    activeTopTab === "chart"
                                                        ? "opacity-100 pointer-events-auto relative"
                                                        : "opacity-0 pointer-events-none"
                                                }`}
                                            >
                                                <TradingChart />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ResizablePanel>

                        <ResizableHandle />

                        {/* Bottom Section - Positions Tabs */}
                        <ResizablePanel defaultSize={30} minSize={20}>
                            <PositionsTabs />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </TradingFormProvider>
        </TradingProvider>
    );
}
