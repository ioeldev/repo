import { useEffect, useRef } from "react";
import { useTradingContext } from "@/contexts/TradingContext";
import { useTheme } from "../theme-provider";

export function TradingChart() {
    const { selectedPair } = useTradingContext();
    const container = useRef<HTMLDivElement>(null);
    const { resolvedTheme } = useTheme();

    // Compute background color based on current theme
    const backgroundColor = resolvedTheme === "light" ? "#ffffff" : "#181a21";

    useEffect(() => {
        if (!selectedPair) return;

        // Clear previous scripts from container
        if (container.current) {
            container.current.innerHTML = "";
        }

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = `
        {
          "allow_symbol_change": false,
          "calendar": false,
          "details": false,
          "hide_side_toolbar": true,
          "hide_top_toolbar": true,
          "hide_legend": false,
          "hide_volume": true,
          "hotlist": false,
          "interval": "15",
          "locale": "en",
          "save_image": true,
          "style": "1",
          "symbol": "BINANCE:${selectedPair.pair}",
          "theme": "${resolvedTheme}",
          "timezone": "Etc/UTC",
          "backgroundColor": "${backgroundColor}",
          "gridColor": "${backgroundColor}",
          "watchlist": [],
          "withdateranges": false,
          "compareSymbols": [],
          "studies": [],
          "autosize": true,
          "disabled_features": [
            "pricescale_currency"
          ]
        }`;
        container.current?.appendChild(script);
    }, [selectedPair, backgroundColor, resolvedTheme]);

    return (
        <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
            <div
                className="tradingview-widget-container__widget"
                style={{ height: "calc(100% - 32px)", width: "100%" }}
            ></div>
        </div>
    );
}
