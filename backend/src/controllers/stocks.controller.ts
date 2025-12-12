import { Request, Response } from 'express';
import stocks from '../contents/stocks.json';

export const fetchPairs = async (req: Request, res: Response) => {
    try {
        const uniqueStocksMap = new Map();
        for (const stock of stocks) {
            uniqueStocksMap.set(stock.symbol, stock);
        }
        const uniqueStocksArray = Array.from(uniqueStocksMap.values());

        res.json(uniqueStocksArray);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};
