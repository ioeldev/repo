"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePositions } from "@/hooks/usePositions";
import { usePositionPnL } from "@/hooks/usePositionPnL";
import { PositionsTableOptimized } from "@/components/positions/PositionsTableOptimized";

export function PositionsTabs() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<"positions" | "position-history">("positions");

    // Fetch open positions with close functionality
    const {
        positions: openPositions,
        isLoading: openLoading,
        closePositionAsync,
        isClosing,
    } = usePositions(1, 50, "open");

    // Fetch closed positions (history)
    const { positions: closedPositions, isLoading: closedLoading } = usePositions(1, 50, "closed");

    // Add ticker symbols for real-time updates
    const openPositionsWithTickers = usePositionPnL(openPositions);

    // Handle closing a position
    const handleClosePosition = async (positionId: string, exitPrice: number) => {
        try {
            const result = await closePositionAsync({
                position: {
                    _id: positionId,
                    exit_price: exitPrice,
                    exit_time: new Date().toISOString(),
                },
            });

            if (result.success) {
                // Position closed successfully
                console.log(`Position closed successfully. P&L: ${result.data.pnl}`);
            }
        } catch (error: any) {
            console.error("Failed to close position:", error);
            throw error;
        }
    };

    return (
        <div className="w-full h-full bg-card flex flex-col">
            {/* Horizontally Scrollable Tab Header */}
            <div className="flex overflow-x-auto border-b border-border flex-shrink-0 scrollbar-hide">
                <button
                    onClick={() => setActiveTab("positions")}
                    className={`px-4 py-3 text-sm font-medium transition whitespace-nowrap ${
                        activeTab === "positions"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    {t("user.positionsTabs.positions")}
                </button>
                <button
                    onClick={() => setActiveTab("position-history")}
                    className={`px-4 py-3 text-sm font-medium transition whitespace-nowrap ${
                        activeTab === "position-history"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    {t("user.positionsTabs.positionHistory")}
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "positions" && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">
                                {t("user.positionsTabs.openPositions", { count: openPositions.length })}
                            </p>
                            <PositionsTableOptimized
                                positions={openPositionsWithTickers}
                                isLoading={openLoading}
                                showRealTimePnL={true}
                                onClosePosition={handleClosePosition}
                                isClosing={isClosing}
                            />
                        </div>
                    </div>
                )}

                {activeTab === "position-history" && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">
                                {t("user.positionsTabs.positionHistoryCount", { count: closedPositions.length })}
                            </p>
                            <PositionsTableOptimized
                                positions={closedPositions}
                                isLoading={closedLoading}
                                showRealTimePnL={false}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
