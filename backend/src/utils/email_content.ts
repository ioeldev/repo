import moment from "moment-timezone";
import { positionOpenHtml } from "../contents/email_templates/position_open";
import { positionClosedHtml } from "../contents/email_templates/position_closed";
import { positionLiquidatedHtml } from "../contents/email_templates/position_liquidated";
import { portfolioLiquidatedHtml } from "../contents/email_templates/portfolio_liquidated";

interface OpenPositionEmailParams {
    symbol: string;
    leverage: number;
    entryDate: Date;
    dashboardUrl: string;
    logoUrl: string;
}

export function getOpenPositionEmailContent({
    symbol,
    leverage,
    entryDate,
    dashboardUrl,
    logoUrl,
}: OpenPositionEmailParams): string {
    return positionOpenHtml
        .replace(/{{SYMBOL}}/g, symbol)
        .replace(/{{ENTRY_DATE}}/g, moment(entryDate).format("DD/MM/YYYY HH:mm:ss"))
        .replace(/{{LEVERAGE}}/g, leverage.toString())
        .replace(/{{DASHBOARD_URL}}/g, dashboardUrl)
        .replace(/{{IMG_SRC}}/g, logoUrl);
}

interface ClosePositionEmailParams {
    symbol: string;
    type: "buy" | "sell";
    quantity: number;
    entryPrice: number;
    entryDate: Date;
    exitPrice: number;
    exitDate: Date;
    leverage: number;
    baseCurrency: string;
    pnl: number;
    dashboardUrl: string;
    logoUrl: string;
}

export function getClosePositionEmailContent({
    symbol,
    type,
    quantity,
    entryPrice,
    entryDate,
    exitPrice,
    exitDate,
    leverage,
    baseCurrency,
    pnl,
    dashboardUrl,
    logoUrl,
}: ClosePositionEmailParams): string {
    const typeInFrench = type === "buy" ? "Achat" : "Vente";
    const performance = ((exitPrice - entryPrice) / entryPrice) * 100;

    // Replace placeholders with actual values
    return positionClosedHtml
        .replace(/{{SYMBOL}}/g, symbol)
        .replace(/{{TYPE}}/g, typeInFrench)
        .replace(/{{ENTRY_DATE}}/g, moment(entryDate).format("DD/MM/YYYY HH:mm:ss"))
        .replace(/{{ENTRY_PRICE}}/g, entryPrice.toString())
        .replace(/{{QUANTITY}}/g, quantity.toString())
        .replace(/{{LEVERAGE}}/g, leverage.toString())
        .replace(/{{EXIT_DATE}}/g, moment(exitDate).format("DD/MM/YYYY HH:mm:ss"))
        .replace(/{{EXIT_PRICE}}/g, exitPrice.toString())
        .replace(/{{BASE_CURRENCY}}/g, baseCurrency)
        .replace(/{{PNL}}/g, pnl.toFixed(6))
        .replace(/{{PERFORMANCE}}/g, performance.toFixed(2))
        .replace(/{{DASHBOARD_URL}}/g, dashboardUrl)
        .replace(/{{IMG_SRC}}/g, logoUrl);
}

interface LiquidatePositionEmailParams {
    symbol: string;
    type: "buy" | "sell";
    quantity: number;
    entryPrice: number;
    entryDate: Date;
    exitPrice: number;
    exitDate: Date;
    leverage: number;
    baseCurrency: string;
    pnl: number;
    dashboardUrl: string;
    logoUrl: string;
}

export function getLiquidatePositionEmailContent({
    symbol,
    type,
    quantity,
    entryPrice,
    entryDate,
    exitPrice,
    exitDate,
    leverage,
    baseCurrency,
    pnl,
    dashboardUrl,
    logoUrl,
}: LiquidatePositionEmailParams): string {
    const typeInFrench = type === "buy" ? "Achat" : "Vente";
    const performance = ((exitPrice - entryPrice) / entryPrice) * 100;

    // Replace placeholders with actual values
    return positionLiquidatedHtml
        .replace(/{{SYMBOL}}/g, symbol)
        .replace(/{{TYPE}}/g, typeInFrench)
        .replace(/{{ENTRY_DATE}}/g, moment(entryDate).format("DD/MM/YYYY HH:mm:ss"))
        .replace(/{{ENTRY_PRICE}}/g, entryPrice.toString())
        .replace(/{{QUANTITY}}/g, quantity.toString())
        .replace(/{{LEVERAGE}}/g, leverage.toString())
        .replace(/{{EXIT_DATE}}/g, moment(exitDate).format("DD/MM/YYYY HH:mm:ss"))
        .replace(/{{EXIT_PRICE}}/g, exitPrice.toString())
        .replace(/{{BASE_CURRENCY}}/g, baseCurrency)
        .replace(/{{PNL}}/g, pnl.toFixed(6))
        .replace(/{{PERFORMANCE}}/g, performance.toFixed(2))
        .replace(/{{DASHBOARD_URL}}/g, dashboardUrl)
        .replace(/{{IMG_SRC}}/g, logoUrl);
}

interface PortfolioLiquidationEmailParams {
    baseCurrency: string;
    liquidationDate: Date;
    totalExposure: number;
    marginRatio: number;
    minMarginRatio: number;
    unrealizedPnl: number;
    positionsList: string;
    dashboardUrl: string;
    logoUrl: string;
}

export function getPortfolioLiquidationEmailContent({
    baseCurrency,
    liquidationDate,
    totalExposure,
    marginRatio,
    minMarginRatio,
    unrealizedPnl,
    positionsList,
    dashboardUrl,
    logoUrl,
}: PortfolioLiquidationEmailParams): string {
    // Replace placeholders with actual values
    return portfolioLiquidatedHtml
        .replace(/{{BASE_CURRENCY}}/g, baseCurrency)
        .replace(/{{LIQUIDATION_DATE}}/g, moment(liquidationDate).format("DD/MM/YYYY HH:mm:ss"))
        .replace(/{{TOTAL_EXPOSURE}}/g, totalExposure.toFixed(6))
        .replace(/{{MARGIN_RATIO}}/g, (marginRatio * 100).toFixed(2))
        .replace(/{{MIN_MARGIN_RATIO}}/g, (minMarginRatio * 100).toFixed(2))
        .replace(/{{UNREALIZED_PNL}}/g, unrealizedPnl.toFixed(6))
        .replace(/{{POSITIONS_LIST}}/g, positionsList)
        .replace(/{{DASHBOARD_URL}}/g, dashboardUrl)
        .replace(/{{IMG_SRC}}/g, logoUrl);
}
