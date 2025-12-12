import dotenv from "dotenv";
dotenv.config();

import moment from "moment-timezone";
import "moment/locale/fr";

moment.tz.setDefault('Europe/Paris');
moment.locale("fr");

import axios from "axios";
import { Position, PositionsModel } from "../../models/positions.model";
import { User } from "../../models/users.model";
import { invokeEmailSender } from "../../utils/lambda_invokes";
import { getClosePositionEmailContent, getLiquidatePositionEmailContent } from "../../utils/email_content";
import { calculateUnrealizedPnl } from "../../utils/pnl";

interface Pair {
    symbol: string;
    priceChange: string;
    priceChangePercent: string;
    prevClosePrice: string;
    lastPrice: string;
    bidPrice: string;
    bidQty: string;
    askPrice: string;
    askQty: string;
    openPrice: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
    openTime: number;
    closeTime: number;
    count: any;
}

type MEXCTicker24hResponse = Pair[];

export const handler = async (event: any) => {
    const startTime = Date.now(); // Record the start time
    const maxExecutionTime = 25 * 1000; // Set maximum execution time (e.g., 25 seconds to stay within Lambda's 30-second timeout)

    while (Date.now() - startTime < maxExecutionTime) {
        console.log("Started monitoring positions")

        try {
            const ticker24hResponse = await axios.get<MEXCTicker24hResponse>(
                "https://api.mexc.com/api/v3/ticker/24hr"
            );

            const openPositions = await Position.collection
                .find({
                    status: "open",
                })
                .toArray();

            for (const position of openPositions) {
                const pair = `${position.symbol}${position.base_currency}`;
                const { liquidation_price, take_profit, stop_loss } = position;

                const pairData = ticker24hResponse.data.find((p) => p.symbol === pair);
                if (!pairData) {
                    continue;
                }

                const currentPrice = Number(pairData.lastPrice);

                // Check liquidation
                if (liquidation_price) {
                    const shouldLiquidate =
                        position.type === "buy"
                            ? currentPrice <= liquidation_price
                            : currentPrice >= liquidation_price;

                    if (shouldLiquidate) {
                        await handlePositionClose(position, currentPrice, true);
                        continue; // Skip other checks if liquidated
                    }
                }

                // Check take profit
                if (take_profit) {
                    const takeProfitHit =
                        position.type === "buy"
                            ? currentPrice >= take_profit // Long position: price went up
                            : currentPrice <= take_profit; // Short position: price went down

                    if (takeProfitHit) {
                        await handlePositionClose(position, currentPrice, false);
                        continue;
                    }
                }

                // Check stop loss
                if (stop_loss) {
                    const stopLossHit =
                        position.type === "buy"
                            ? currentPrice <= stop_loss // Long position: price went down
                            : currentPrice >= stop_loss; // Short position: price went up

                    if (stopLossHit) {
                        await handlePositionClose(position, currentPrice, false);
                        continue;
                    }
                }
            }
        } catch (error) {
            console.error("Error in leverage monitor loop:", error);
        }

        // Introduce a short delay to avoid hammering the external API or database
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log("Finished monitoring positions")
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Leverage monitor executed successfully",
        }),
    };
};

async function handlePositionClose(position: PositionsModel, currentPrice: number, isLiquidation: boolean) {
    console.log(`${isLiquidation ? 'Liquidation' : 'Closing position'} for ${position.symbol}${position.base_currency}`);

    let amountToUpdateBalance;
    let pnl = 0;

    if (isLiquidation) {
        // For liquidation, we deduct the full position value
        amountToUpdateBalance = -(position.entry_price * position.quantity);
        pnl = -amountToUpdateBalance;
    } else {
        // For TP/SL, calculate profit/loss using centralized utility
        // IMPORTANT: quantity is already leveraged, don't multiply by leverage again
        pnl = calculateUnrealizedPnl(
            position.type as "buy" | "sell",
            position.entry_price,
            currentPrice,
            position.quantity // Already leveraged
        );

        // Amount to update balance = margin + PnL
        amountToUpdateBalance = position.base_currency_amount + pnl;
    }

    const exitTime = new Date();

    await Position.updateOneById(position._id, {
        status: "closed",
        exit_price: currentPrice,
        exit_time: exitTime,
        liquidated: isLiquidation,
    });

    await User.updateBalance(
        position.user_id,
        position.base_currency,
        amountToUpdateBalance
    );

    // Send email notification
    try {
        const user = await User.findOneById(position.user_id);
        if (!user?.email) return;

        const emailParams = {
            symbol: `${position.symbol}/${position.base_currency}`,
            type: position.type,
            quantity: position.quantity,
            entryPrice: position.entry_price,
            entryDate: position.entry_time,
            exitPrice: currentPrice,
            exitDate: exitTime,
            leverage: position.leverage || 1,
            baseCurrency: position.base_currency,
            pnl,
            dashboardUrl: process.env.DASHBOARD_URL,
            logoUrl: process.env.LOGO_URL,
        };

        const emailContent = isLiquidation
            ? getLiquidatePositionEmailContent(emailParams)
            : getClosePositionEmailContent(emailParams);

        await invokeEmailSender({
            to: user.email,
            subject: isLiquidation ? "Position liquidée" : "Position clôturée",
            html: emailContent,
        });
    } catch (e) {
        console.log("Error sending email", e);
    }
}
