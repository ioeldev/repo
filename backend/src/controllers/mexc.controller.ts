import { Request, Response } from "express";
import axios from "axios";
import pairs from "../contents/pairs.json";

export const fetchPairs = async (req: Request, res: Response) => {
    try {
        // Get 24hr ticker data
        const ticker24hResponse = await axios.get("https://api.mexc.com/api/v3/ticker/24hr");

        ticker24hResponse.data.sort((a: any, b: any) => b.volume * b.lastPrice - a.volume * a.lastPrice);

        // Filter pairs based on pairs.json
        // const validPairs = pairs.map((pair: any) => pair.pair);

        const usdtPairs = ticker24hResponse.data
            .filter((pair: any) => pair.symbol.endsWith("USDT"))
            .map((pair: any) => ({
                name: pair.symbol.replace("USDT", ""),
                pair: pair.symbol,
                price: pair.lastPrice,
                change: `${Math.round(pair.priceChangePercent * 100 * 100) / 100}%`,
                volume: pair.volume,
            }));

        const btcPairs = ticker24hResponse.data
            .filter((pair: any) => pair.symbol.endsWith("BTC"))
            .map((pair: any) => ({
                name: pair.symbol.replace("BTC", ""),
                pair: pair.symbol,
                price: pair.lastPrice,
                change: `${Math.round(pair.priceChangePercent * 100 * 100) / 100}%`,
                volume: pair.volume,
            }));

        // Combine and sort by volume * price
        const response = [...btcPairs, ...usdtPairs];
        response.sort((a, b) => b.volume * b.price - a.volume * a.price);
        // export response to json file
        res.json(response);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};
