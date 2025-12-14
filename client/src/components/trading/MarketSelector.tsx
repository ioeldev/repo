import { useState, useMemo, useRef, useEffect, memo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Search } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePairs } from "@/hooks/usePairs";
import { useTradingContext } from "@/contexts/TradingContext";
import { useTickerSymbol } from "@/contexts/TickerContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";

type Pair = {
    name: string;
    pair: string;
    price: string;
    change: string;
    volume: string;
};

// Memoized component for individual market items to prevent re-renders
const MarketItem = memo(({ pair }: { pair: Pair }) => {
    const ticker = useTickerSymbol(pair.pair);
    const price = ticker?.price || parseFloat(pair.price);
    const changePercent = ticker?.priceChangePercent || parseFloat(pair.change.replace("%", ""));

    const formatPrice = (price: number) => {
        if (isNaN(price)) return "0.00";
        return price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <>
            <div className="flex flex-col gap-1">
                <span className="font-semibold text-foreground text-sm">{pair.pair}</span>
                <span className="text-xs text-muted-foreground">${formatPrice(price)}</span>
            </div>
            <span className={`text-sm font-medium ${changePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                {changePercent >= 0 ? "+" : ""}
                {changePercent.toFixed(2)}%
            </span>
        </>
    );
});

export function MarketSelector() {
    const { t } = useTranslation();
    const { pairs, isLoading } = usePairs();
    const { selectedPair, setSelectedPair } = useTradingContext();
    const [desktopSearch, setDesktopSearch] = useState("");
    const [mobileSearch, setMobileSearch] = useState("");
    const [isDesktopOpen, setIsDesktopOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    // Get real-time ticker data from WebSocket - only subscribes to selected pair
    const tickerData = useTickerSymbol(selectedPair?.pair || "");

    // Refs for virtualizers
    const desktopParentRef = useRef<HTMLDivElement>(null);
    const mobileParentRef = useRef<HTMLDivElement>(null);

    // Filter pairs based on search
    const filteredDesktopPairs = useMemo(() => {
        if (!pairs) return [];
        if (!desktopSearch) return pairs;
        const search = desktopSearch.toLowerCase();
        return pairs.filter(
            (pair: Pair) => pair.name.toLowerCase().includes(search) || pair.pair.toLowerCase().includes(search)
        );
    }, [pairs, desktopSearch]);

    const filteredMobilePairs = useMemo(() => {
        if (!pairs) return [];
        if (!mobileSearch) return pairs;
        const search = mobileSearch.toLowerCase();
        return pairs.filter(
            (pair: Pair) => pair.name.toLowerCase().includes(search) || pair.pair.toLowerCase().includes(search)
        );
    }, [pairs, mobileSearch]);

    // Virtual scrolling for desktop
    const desktopVirtualizer = useVirtualizer({
        count: filteredDesktopPairs.length,
        getScrollElement: () => desktopParentRef.current,
        estimateSize: () => 60,
    });

    // Virtual scrolling for mobile
    const mobileVirtualizer = useVirtualizer({
        count: filteredMobilePairs.length,
        getScrollElement: () => mobileParentRef.current,
        estimateSize: () => 70,
    });

    // Recalculate virtualizer when dropdown/drawer opens or filtered pairs change
    useEffect(() => {
        if (isDesktopOpen && desktopParentRef.current) {
            // Reset scroll and recalculate after DOM is ready
            desktopParentRef.current.scrollTop = 0;
            // Use multiple animation frames to ensure DOM is fully ready
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (desktopParentRef.current) {
                            desktopVirtualizer.measure();
                        }
                    });
                });
            });
        }
    }, [isDesktopOpen, filteredDesktopPairs.length, desktopVirtualizer]);

    useEffect(() => {
        if (isMobileOpen && mobileParentRef.current) {
            // Reset scroll and recalculate after DOM is ready
            mobileParentRef.current.scrollTop = 0;
            // Use multiple animation frames to ensure DOM is fully ready
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (mobileParentRef.current) {
                            mobileVirtualizer.measure();
                        }
                    });
                });
            });
        }
    }, [isMobileOpen, filteredMobilePairs.length, mobileVirtualizer]);

    // Format price
    const formatPrice = (price: string) => {
        const num = parseFloat(price);
        if (isNaN(num)) return "0.00";
        return num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    // Format change percentage
    const formatChange = (change: string) => {
        const cleanChange = change.replace("%", "");
        const num = parseFloat(cleanChange);
        if (isNaN(num)) return "0.00";
        return num.toFixed(2);
    };

    if (isLoading || !selectedPair) {
        return (
            <div className="w-full h-16 lg:h-16 bg-card border-b border-border flex items-center justify-center">
                <span className="text-sm text-muted-foreground">{t("user.trading.loadingMarkets")}</span>
            </div>
        );
    }

    // Get display values (real-time if available, fallback to static)
    const displayHigh = tickerData?.high || 0;
    const displayLow = tickerData?.low || 0;
    const displayVolume = tickerData?.volume || parseFloat(selectedPair.volume || "0");

    return (
        <>
            {/* Desktop Version - Hidden on Mobile */}
            <div className="hidden lg:flex items-center justify-between w-full bg-card border-b border-border pr-6">
                <div className="flex items-center gap-6">
                    <DropdownMenu open={isDesktopOpen} onOpenChange={setIsDesktopOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="lg"
                                className="h-16 rounded-none hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-0"
                            >
                                <div className="text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-foreground">{selectedPair.pair}</span>
                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-96 p-0" sideOffset={4} alignOffset={4}>
                            {/* Search Input */}
                            <div className="p-2 border-b border-border sticky top-0 bg-background">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t("user.trading.searchMarkets")}
                                        value={desktopSearch}
                                        onChange={(e) => setDesktopSearch(e.target.value)}
                                        className="pl-9"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>

                            {/* Pairs List - Virtualized */}
                            <div
                                ref={desktopParentRef}
                                style={{
                                    height: "400px",
                                    overflow: "auto",
                                }}
                            >
                                {filteredDesktopPairs.length > 0 ? (
                                    <>
                                        {desktopVirtualizer.getVirtualItems().length > 0 ? (
                                            <div
                                                style={{
                                                    height: `${desktopVirtualizer.getTotalSize()}px`,
                                                    width: "100%",
                                                    position: "relative",
                                                }}
                                            >
                                                {desktopVirtualizer.getVirtualItems().map((virtualItem) => {
                                                    const pair = filteredDesktopPairs[virtualItem.index];
                                                    return (
                                                        <div
                                                            key={virtualItem.key}
                                                            style={{
                                                                position: "absolute",
                                                                top: 0,
                                                                left: 0,
                                                                width: "100%",
                                                                height: `${virtualItem.size}px`,
                                                                transform: `translateY(${virtualItem.start}px)`,
                                                            }}
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedPair(pair);
                                                                    setDesktopSearch("");
                                                                    setIsDesktopOpen(false);
                                                                }}
                                                                className="flex items-center justify-between w-full py-3 px-4 hover:bg-muted/50 text-left transition h-full"
                                                            >
                                                                <MarketItem pair={pair} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            // Fallback: render all items when virtualizer hasn't calculated yet
                                            filteredDesktopPairs.map((pair) => (
                                                <button
                                                    key={pair.pair}
                                                    onClick={() => {
                                                        setSelectedPair(pair);
                                                        setDesktopSearch("");
                                                        setIsDesktopOpen(false);
                                                    }}
                                                    className="flex items-center justify-between w-full py-3 px-4 hover:bg-muted/50 text-left transition"
                                                    style={{ height: "60px" }}
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-semibold text-foreground text-sm">
                                                            {pair.pair}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ${formatPrice(pair.price)}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`text-sm font-medium ${
                                                            parseFloat(formatChange(pair.change)) >= 0
                                                                ? "text-green-500"
                                                                : "text-red-500"
                                                        }`}
                                                    >
                                                        {parseFloat(formatChange(pair.change)) >= 0 ? "+" : ""}
                                                        {formatChange(pair.change)}%
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </>
                                ) : (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        No markets found
                                    </div>
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex flex-col justify-start items-start">
                        {(() => {
                            const displayPrice = tickerData?.price?.toString() || selectedPair.price;
                            const displayChange =
                                tickerData?.priceChangePercent ?? parseFloat(selectedPair.change.replace("%", ""));
                            const changeNum = parseFloat(formatChange(displayChange.toString()));

                            return (
                                <>
                                    <span className="text-xl font-semibold text-foreground">
                                        ${formatPrice(displayPrice)}
                                    </span>
                                    <span
                                        className={`text-xs font-medium ${
                                            changeNum >= 0 ? "text-green-500" : "text-red-500"
                                        }`}
                                    >
                                        {changeNum >= 0 ? "+" : ""}
                                        {changeNum.toFixed(2)}%
                                    </span>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Additional market stats */}
                <div className="flex items-center gap-6 text-sm">
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">{t("user.trading.high24h")}</span>
                        <span className="font-semibold text-foreground">
                            ${displayHigh > 0 ? formatPrice(displayHigh.toString()) : "--"}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">{t("user.trading.low24h")}</span>
                        <span className="font-semibold text-foreground">
                            ${displayLow > 0 ? formatPrice(displayLow.toString()) : "--"}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">
                            {t("user.trading.volume24h")} ({selectedPair.name})
                        </span>
                        <span className="font-semibold text-foreground">
                            {displayVolume.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Mobile Version - Drawer with Virtual Scrolling */}
            <div className="lg:hidden flex items-center justify-between w-full h-14 px-4 bg-card border-b border-border">
                <Drawer open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <DrawerTrigger asChild>
                        <button className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-foreground">{selectedPair.pair}</span>
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="text-right">
                                {(() => {
                                    const displayPrice = tickerData?.price?.toString() || selectedPair.price;
                                    const displayChange =
                                        tickerData?.priceChangePercent ??
                                        parseFloat(selectedPair.change.replace("%", ""));
                                    const changeNum = parseFloat(formatChange(displayChange.toString()));

                                    return (
                                        <>
                                            <div className="text-lg font-semibold text-foreground">
                                                ${formatPrice(displayPrice)}
                                            </div>
                                            <div
                                                className={`text-xs font-medium ${
                                                    changeNum >= 0 ? "text-green-500" : "text-red-500"
                                                }`}
                                            >
                                                {changeNum >= 0 ? "+" : ""}
                                                {changeNum.toFixed(2)}%
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </button>
                    </DrawerTrigger>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>{t("user.trading.selectMarket")}</DrawerTitle>
                        </DrawerHeader>

                        {/* Search Input */}
                        <div className="px-4 pb-3 sticky top-0 bg-background">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("user.trading.searchMarkets")}
                                    value={mobileSearch}
                                    onChange={(e) => setMobileSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Pairs List - Virtualized */}
                        <div
                            ref={mobileParentRef}
                            style={{
                                height: "400px",
                                overflow: "auto",
                                paddingLeft: "1rem",
                                paddingRight: "1rem",
                                paddingBottom: "1.5rem",
                            }}
                        >
                            {filteredMobilePairs.length > 0 ? (
                                <>
                                    {mobileVirtualizer.getVirtualItems().length > 0 ? (
                                        <div
                                            style={{
                                                height: `${mobileVirtualizer.getTotalSize()}px`,
                                                width: "100%",
                                                position: "relative",
                                            }}
                                        >
                                            {mobileVirtualizer.getVirtualItems().map((virtualItem) => {
                                                const pair = filteredMobilePairs[virtualItem.index];
                                                return (
                                                    <div
                                                        key={virtualItem.key}
                                                        style={{
                                                            position: "absolute",
                                                            top: 0,
                                                            left: 0,
                                                            width: "100%",
                                                            height: `${virtualItem.size}px`,
                                                            transform: `translateY(${virtualItem.start}px)`,
                                                        }}
                                                    >
                                                        <DrawerClose asChild>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedPair(pair);
                                                                    setMobileSearch("");
                                                                    setIsMobileOpen(false);
                                                                }}
                                                                className="flex items-center justify-between w-full py-3 px-4 rounded-lg hover:bg-muted/50 transition text-left h-full"
                                                            >
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <span className="font-semibold text-foreground text-sm">
                                                                        {pair.pair}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        ${formatPrice(pair.price)}
                                                                    </span>
                                                                </div>
                                                                <span
                                                                    className={`text-sm font-medium ${
                                                                        parseFloat(formatChange(pair.change)) >= 0
                                                                            ? "text-green-500"
                                                                            : "text-red-500"
                                                                    }`}
                                                                >
                                                                    {parseFloat(formatChange(pair.change)) >= 0
                                                                        ? "+"
                                                                        : ""}
                                                                    {formatChange(pair.change)}%
                                                                </span>
                                                            </button>
                                                        </DrawerClose>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        // Fallback: render all items when virtualizer hasn't calculated yet
                                        filteredMobilePairs.map((pair) => (
                                            <DrawerClose key={pair.pair} asChild>
                                                <button
                                                    onClick={() => {
                                                        setSelectedPair(pair);
                                                        setMobileSearch("");
                                                        setIsMobileOpen(false);
                                                    }}
                                                    className="flex items-center justify-between w-full py-3 px-4 rounded-lg hover:bg-muted/50 transition text-left"
                                                    style={{ height: "70px" }}
                                                >
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-semibold text-foreground text-sm">
                                                            {pair.pair}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ${formatPrice(pair.price)}
                                                        </span>
                                                    </div>
                                                    <span
                                                        className={`text-sm font-medium ${
                                                            parseFloat(formatChange(pair.change)) >= 0
                                                                ? "text-green-500"
                                                                : "text-red-500"
                                                        }`}
                                                    >
                                                        {parseFloat(formatChange(pair.change)) >= 0 ? "+" : ""}
                                                        {formatChange(pair.change)}%
                                                    </span>
                                                </button>
                                            </DrawerClose>
                                        ))
                                    )}
                                </>
                            ) : (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    {t("user.trading.noMarketsFound")}
                                </div>
                            )}
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </>
    );
}
