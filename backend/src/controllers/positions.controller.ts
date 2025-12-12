import { Request, Response } from "express";
import { Position, PositionsModel } from "../models/positions.model";
import { ObjectId } from "mongodb";
import { User } from "../models/users.model";
import { invokeEmailSender } from "../utils/lambda_invokes";
import { getOpenPositionEmailContent, getClosePositionEmailContent } from "../utils/email_content";

type PaginationParams = {
    skip?: number;
    limit?: number;
    search?: string;
    sortField?: string;
    sortOrder?: number;
    filters?: Record<string, any>;
};

export const getMyPositions = async (req: Request, res: Response) => {
    const { user } = req;
    try {
        const positions = await Position.findAllByUserId(user._id);

        return res.json({ success: true, data: positions });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json({ success: false, message: e.message });
    }
};

export const getAllPositions = async (req: Request, res: Response) => {
    try {
        const { skip, limit, search, sorting, filters } = req.query as unknown as {
            skip?: number;
            limit?: number;
            search?: string;
            sorting?: string;
            filters?: Record<string, any>;
        };

        const searchQuery = search
            ? {
                  $or: [
                      { symbol: { $regex: search, $options: "i" } },
                      { manual_symbol: { $regex: search, $options: "i" } },
                      { base_currency: { $regex: search, $options: "i" } },
                      { type: { $regex: search, $options: "i" } },
                      { status: { $regex: search, $options: "i" } },
                      { "user.first_name": { $regex: search, $options: "i" } },
                      { "user.last_name": { $regex: search, $options: "i" } },
                      { "user.email": { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        const filterQuery = filters
            ? Object.entries(filters).reduce((acc, [key, value]) => {
                  if (key === "user_id") {
                      acc[key] = new ObjectId(value as string);
                  } else if (key.includes(".")) {
                      acc[key] = { $regex: value, $options: "i" };
                  } else if (["entry_price", "exit_price", "quantity", "leverage"].includes(key)) {
                      acc[key] = Number(value);
                  } else if (["entry_time", "exit_time"].includes(key)) {
                      acc[key] = new Date(value);
                  } else {
                      acc[key] = { $regex: value, $options: "i" };
                  }
                  return acc;
              }, {} as Record<string, any>)
            : {};

        const aggregationPipeline: any[] = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            ...(Object.keys(searchQuery).length > 0 ? [{ $match: searchQuery }] : []),
            ...(Object.keys(filterQuery).length > 0 ? [{ $match: filterQuery }] : []),
        ];

        // Parse sorting parameters
        let sortFields: { field: string; order: number }[] = [];
        try {
            sortFields = sorting ? JSON.parse(sorting) : [];
        } catch (e) {
            console.log("Error parsing sorting:", e);
        }

        // Add PNL calculation stage if needed for sorting
        if (sortFields.some((sort) => sort.field === "pnl")) {
            aggregationPipeline.push({
                $addFields: {
                    calculatedPnl: {
                        $let: {
                            vars: {
                                leveragedQuantity: {
                                    $multiply: [
                                        { $toDouble: "$quantity" },
                                        {
                                            $ifNull: [{ $toDouble: "$leverage" }, 1],
                                        },
                                    ],
                                },
                                priceDiff: {
                                    $subtract: [
                                        {
                                            $ifNull: [{ $toDouble: "$exit_price" }, 0],
                                        },
                                        { $toDouble: "$entry_price" },
                                    ],
                                },
                            },
                            in: {
                                $cond: {
                                    if: { $eq: ["$type", "buy"] },
                                    then: {
                                        $multiply: ["$$leveragedQuantity", "$$priceDiff"],
                                    },
                                    else: {
                                        $multiply: ["$$leveragedQuantity", { $multiply: ["$$priceDiff", -1] }],
                                    },
                                },
                            },
                        },
                    },
                },
            });
        }

        // Add sorting stage if sort fields are present
        if (sortFields.length > 0) {
            const sortStage = {
                $sort: sortFields.reduce((acc, { field, order }) => {
                    acc[field === "pnl" ? "calculatedPnl" : field] = order;
                    return acc;
                }, {} as Record<string, number>),
            };
            aggregationPipeline.push(sortStage);
        }

        // Add pagination
        aggregationPipeline.push(
            { $skip: parseInt(skip?.toString() || "0") },
            { $limit: parseInt(limit?.toString() || "50") }
        );

        // To get the total count with search and filters
        const countPipeline = [
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            ...(Object.keys(searchQuery).length > 0 ? [{ $match: searchQuery }] : []),
            ...(Object.keys(filterQuery).length > 0 ? [{ $match: filterQuery }] : []),
            { $count: "total" },
        ];

        const countResult = await Position.collection.aggregate(countPipeline).toArray();

        const totalCount = countResult.length > 0 ? countResult[0].total : 0;

        const positions = await Position.collection.aggregate(aggregationPipeline).toArray();

        return res.json({
            success: true,
            data: positions,
            pagination: {
                total: totalCount,
                skip: parseInt(skip?.toString() || "0"),
                limit: parseInt(limit?.toString() || "50"),
            },
        });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json({ success: false, message: e.message });
    }
};

export const closePosition = async (req: Request, res: Response) => {
    try {
        const { position }: { position: PositionsModel } = req.body;

        const { exit_price, exit_time } = position;

        const positionInDb = await Position.findOneById(new ObjectId(position._id));

        const user = await User.findOneById(positionInDb.user_id);
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const priceDifference = exit_price - positionInDb.entry_price;
        // IMPORTANT: quantity is already the leveraged position size from frontend
        // Frontend sends: quantity = (margin * leverage) / entryPrice
        // So we should NOT multiply by leverage again
        const pnl =
            positionInDb.type === "buy"
                ? priceDifference * positionInDb.quantity
                : -priceDifference * positionInDb.quantity;

        let fees = 0;
        if (pnl > 0 && user.fee_percentage) {
            fees = (pnl * user.fee_percentage) / 100;
        }

        // CRITICAL FIX: Only return the margin (base_currency_amount) + PnL - fees
        // NOT the full position value (entry_price * quantity)
        const amountToCredit = positionInDb.base_currency_amount + pnl - fees;

        await User.updateBalance(positionInDb.user_id, positionInDb.base_currency, amountToCredit);

        await Position.updateOneById(new ObjectId(position._id), {
            exit_price,
            exit_time: new Date(exit_time),
            status: "closed",
            fees: fees > 0 ? fees : undefined,
        });

        try {
            const emailContent = getClosePositionEmailContent({
                symbol: `${positionInDb.symbol}/${positionInDb.base_currency}`,
                baseCurrency: positionInDb.base_currency,
                quantity: positionInDb.quantity,
                entryPrice: positionInDb.entry_price,
                exitPrice: exit_price,
                type: positionInDb.type,
                leverage: positionInDb.leverage || 1,
                pnl,
                entryDate: positionInDb.entry_time,
                exitDate: new Date(exit_time),
                dashboardUrl: process.env.DASHBOARD_URL,
                logoUrl: process.env.LOGO_URL,
            });

            await invokeEmailSender({
                to: user.email,
                subject: "Position clôturée",
                html: emailContent,
            });
        } catch (e: any) {
            console.log("Error sending email", e);
        }

        return res.json({
            success: true,
            data: { ...position, exit_price, exit_time, status: "closed" },
        });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json({ success: false, message: e.message });
    }
};

export const createPosition = async (req: Request, res: Response) => {
    const { user } = req;

    try {
        const {
            symbol,
            manual_symbol,
            quantity,
            entry_price,
            base_currency,
            base_currency_amount,
            type,
            leverage,
            liquidation_price: inputLiquidationPrice,
            position_size,
            take_profit,
            stop_loss,
            confirmReversal,
        } = req.body;

        // Look for any open position on the same symbol and base_currency
        const existingPosition = await Position.collection.findOne({
            user_id: user._id,
            symbol,
            base_currency,
            status: "open",
        });

        if (existingPosition) {
            // Ensure leverage remains the same
            if (existingPosition.leverage !== leverage) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message: `Position ouverte avec un levier de ${existingPosition.leverage}x. Impossible de créer une nouvelle position avec un levier de ${leverage}x.`,
                    });
            }
            if (existingPosition.type === type) {
                // --- MERGE LOGIC ---
                const oldQuantity = existingPosition.quantity;
                const newQuantity = oldQuantity + quantity;
                const weightedEntryPrice =
                    (existingPosition.entry_price * oldQuantity + entry_price * quantity) / newQuantity;
                const newBaseCurrencyAmount = (existingPosition.base_currency_amount || 0) + base_currency_amount;
                let newLiquidationPrice;
                if (leverage) {
                    if (type === "buy") {
                        newLiquidationPrice = weightedEntryPrice - weightedEntryPrice / leverage;
                    } else {
                        newLiquidationPrice = weightedEntryPrice + weightedEntryPrice / leverage;
                    }
                } else {
                    newLiquidationPrice = inputLiquidationPrice || existingPosition.liquidation_price;
                }
                const updatePayload = {
                    quantity: newQuantity,
                    entry_price: weightedEntryPrice,
                    base_currency_amount: newBaseCurrencyAmount,
                    liquidation_price: newLiquidationPrice,
                    updated_at: new Date(),
                };
                await User.updateBalance(user._id, base_currency, -base_currency_amount);
                const mergedPosition = await Position.updateOneById(existingPosition._id, updatePayload);
                return res.json({
                    success: true,
                    data: mergedPosition,
                    message: "Position merged into an existing cross margin position",
                });
            } else {
                // --- REVERSAL SCENARIO ---
                if (!confirmReversal) {
                    return res
                        .status(400)
                        .json({
                            success: false,
                            message: "Cet ordre inversera votre position existante. Veuillez confirmer l'inversion.",
                            reversalRequired: true,
                        });
                }
                const reversalQty = quantity;
                if (reversalQty < existingPosition.quantity) {
                    // Partial reversal
                    const closedQty = reversalQty;
                    const remainingQty = existingPosition.quantity - closedQty;
                    let pnl;
                    if (existingPosition.type === "buy") {
                        const priceDiff = entry_price - existingPosition.entry_price;
                        pnl = priceDiff * (closedQty * leverage);
                    } else {
                        const priceDiff = existingPosition.entry_price - entry_price;
                        pnl = priceDiff * (closedQty * leverage);
                    }
                    let fees = 0;
                    if (pnl > 0 && user.fee_percentage) {
                        fees = (pnl * user.fee_percentage) / 100;
                    }
                    const amountToCredit = existingPosition.entry_price * closedQty + pnl - fees;
                    await User.updateBalance(user._id, base_currency, amountToCredit);
                    const remainingCollateral =
                        existingPosition.base_currency_amount * (remainingQty / existingPosition.quantity);
                    await Position.updateOneById(existingPosition._id, {
                        quantity: remainingQty,
                        base_currency_amount: remainingCollateral,
                        updated_at: new Date(),
                    });
                    return res.json({
                        success: true,
                        data: {
                            ...existingPosition,
                            quantity: remainingQty,
                            base_currency_amount: remainingCollateral,
                        },
                        message: "Position partially reversed",
                    });
                } else if (reversalQty === existingPosition.quantity) {
                    // Full reversal
                    let pnl;
                    if (existingPosition.type === "buy") {
                        const priceDiff = entry_price - existingPosition.entry_price;
                        // quantity is already leveraged, don't multiply again
                        pnl = priceDiff * existingPosition.quantity;
                    } else {
                        const priceDiff = existingPosition.entry_price - entry_price;
                        // quantity is already leveraged, don't multiply again
                        pnl = priceDiff * existingPosition.quantity;
                    }
                    let fees = 0;
                    if (pnl > 0 && user.fee_percentage) {
                        fees = (pnl * user.fee_percentage) / 100;
                    }
                    // CRITICAL FIX: Only return margin + PnL, not position value
                    const amountToCredit = existingPosition.base_currency_amount + pnl - fees;
                    await User.updateBalance(user._id, base_currency, amountToCredit);
                    await Position.updateOneById(existingPosition._id, {
                        exit_price: entry_price,
                        exit_time: new Date(),
                        status: "closed",
                        fees: fees > 0 ? fees : undefined,
                        updated_at: new Date(),
                    });
                    return res.json({
                        success: true,
                        data: { ...existingPosition, exit_price: entry_price, exit_time: new Date(), status: "closed" },
                        message: "Position fully reversed",
                    });
                } else {
                    // reversalQty > existingPosition.quantity: close full existing position and open new position with extra quantity
                    let pnl;
                    if (existingPosition.type === "buy") {
                        const priceDiff = entry_price - existingPosition.entry_price;
                        // quantity is already leveraged, don't multiply again
                        pnl = priceDiff * existingPosition.quantity;
                    } else {
                        const priceDiff = existingPosition.entry_price - entry_price;
                        // quantity is already leveraged, don't multiply again
                        pnl = priceDiff * existingPosition.quantity;
                    }
                    let fees = 0;
                    if (pnl > 0 && user.fee_percentage) {
                        fees = (pnl * user.fee_percentage) / 100;
                    }
                    // CRITICAL FIX: Only return margin + PnL, not position value
                    const amountToCredit = existingPosition.base_currency_amount + pnl - fees;
                    await User.updateBalance(user._id, base_currency, amountToCredit);
                    await Position.updateOneById(existingPosition._id, {
                        exit_price: entry_price,
                        exit_time: new Date(),
                        status: "closed",
                        fees: fees > 0 ? fees : undefined,
                        updated_at: new Date(),
                    });
                    const extraQty = reversalQty - existingPosition.quantity;
                    const extraCollateral = base_currency_amount * (extraQty / reversalQty);
                    await User.updateBalance(user._id, base_currency, -extraCollateral);
                    const newPosition = new Position({
                        user_id: user._id,
                        symbol,
                        manual_symbol,
                        base_currency,
                        base_currency_amount: extraCollateral,
                        quantity: extraQty,
                        entry_price,
                        entry_time: new Date(),
                        status: "open",
                        type,
                        leverage,
                        liquidation_price: inputLiquidationPrice,
                        position_size,
                        take_profit,
                        stop_loss,
                    });
                    const savedPosition = await newPosition.save();
                    try {
                        const emailContent = getOpenPositionEmailContent({
                            symbol: `${symbol}/${base_currency}`,
                            leverage,
                            entryDate: new Date(),
                            dashboardUrl: process.env.DASHBOARD_URL,
                            logoUrl: process.env.LOGO_URL,
                        });
                        await invokeEmailSender({
                            to: user.email,
                            subject: "Nouvelle position ouverte",
                            html: emailContent,
                        });
                    } catch (e: any) {
                        console.log("Error sending email", e);
                    }
                    return res.json({
                        success: true,
                        data: { ...savedPosition, user },
                        message: "Position reversed and new opposite position created",
                    });
                }
            }
        }

        // If no existing open position, create a new one normally:
        const position = new Position({
            user_id: user._id,
            symbol,
            manual_symbol,
            base_currency,
            base_currency_amount,
            quantity,
            entry_price,
            entry_time: new Date(),
            status: "open",
            type,
            leverage,
            liquidation_price: inputLiquidationPrice,
            position_size,
            take_profit,
            stop_loss,
        });

        await User.updateBalance(user._id, base_currency, -base_currency_amount);
        const savedPosition = await position.save();
        try {
            const emailContent = getOpenPositionEmailContent({
                symbol: `${symbol}/${base_currency}`,
                leverage,
                entryDate: new Date(),
                dashboardUrl: process.env.DASHBOARD_URL,
                logoUrl: process.env.LOGO_URL,
            });
            await invokeEmailSender({
                to: user.email,
                subject: "Nouvelle position ouverte",
                html: emailContent,
            });
        } catch (e: any) {
            console.log("Error sending email", e);
        }

        return res.json({
            success: true,
            data: { ...savedPosition, user },
        });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json({ success: false, message: e.message });
    }
};

export const adminCreatePosition = async (req: Request, res: Response) => {
    try {
        const {
            user_id,
            symbol,
            manual_symbol,
            quantity,
            entry_time,
            entry_price,
            exit_time,
            exit_price,
            base_currency,
            base_currency_amount,
            status,
            type,
            leverage,
            liquidation_price,
            position_size,
            take_profit,
            stop_loss,
        } = req.body;

        const user = await User.findOneById(new ObjectId(user_id as string));
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        let fees = 0;
        if (Number(exit_price) && status === "closed") {
            const leveragedQuantity = leverage ? quantity * leverage : quantity;
            const priceDifference = exit_price - entry_price;
            const pnl = type === "buy" ? priceDifference * leveragedQuantity : -priceDifference * leveragedQuantity;

            if (pnl > 0 && user.fee_percentage) {
                fees = (pnl * user.fee_percentage) / 100;
            }
        }

        const position = new Position({
            user_id: new ObjectId(user_id as string),
            symbol,
            manual_symbol,
            base_currency,
            base_currency_amount,
            quantity,
            entry_price,
            entry_time: new Date(entry_time),
            exit_price,
            exit_time: exit_time ? new Date(exit_time) : null,
            status,
            type,
            leverage,
            liquidation_price,
            position_size,
            take_profit,
            stop_loss,
            fees: fees > 0 ? fees : undefined,
        });

        if (Number(exit_price)) {
            const leveragedQuantity = leverage ? quantity * leverage : quantity;
            const priceDifference = exit_price - entry_price;
            const pnl = type === "buy" ? priceDifference * leveragedQuantity : -priceDifference * leveragedQuantity;

            await User.updateBalance(new ObjectId(user_id as string), base_currency, pnl - fees);
        } else {
            await User.updateBalance(new ObjectId(user_id as string), base_currency, -base_currency_amount);
        }

        await position.save();

        try {
            const emailContent = getOpenPositionEmailContent({
                symbol: `${symbol}/${base_currency}`,
                leverage,
                entryDate: new Date(entry_time),
                dashboardUrl: process.env.DASHBOARD_URL,
                logoUrl: process.env.LOGO_URL,
            });

            await invokeEmailSender({
                to: user.email,
                subject: "Nouvelle position ouverte",
                html: emailContent,
            });
        } catch (e: any) {
            console.log("Error sending email", e);
        }

        return res.json({
            success: true,
            data: { ...position.position, user },
        });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json({ success: false, message: e.message });
    }
};

export const adminUpdatePosition = async (req: Request, res: Response) => {
    try {
        const position_id = req.params.id;
        const payload = req.body;

        const position = await Position.findOneById(new ObjectId(position_id));
        const user = await User.findOneById(position.user_id);

        if (position.status === "open") {
            await User.updateBalance(position.user_id, position.base_currency, position.base_currency_amount);
        }

        await Position.deleteOneById(new ObjectId(position._id));

        payload.user_id = new ObjectId(payload.user_id as string);
        delete payload.user;

        // Format values to correct type
        payload._id = new ObjectId(position_id);
        if (payload.entry_time) {
            payload.entry_time = new Date(payload.entry_time);
        }
        if (payload.exit_time) {
            payload.exit_time = new Date(payload.exit_time);
        }

        // Calculate fees if position is closed and has positive PNL
        let fees = 0;
        if (Number(payload.exit_price) && payload.status === "closed") {
            const leveragedQuantity = payload.leverage ? payload.quantity * payload.leverage : payload.quantity;
            const priceDifference = payload.exit_price - payload.entry_price;
            const pnl =
                payload.type === "buy" ? priceDifference * leveragedQuantity : -priceDifference * leveragedQuantity;

            if (pnl > 0 && user.fee_percentage) {
                fees = (pnl * user.fee_percentage) / 100;
            }
        }

        payload.fees = fees > 0 ? fees : undefined;
        const newPosition = new Position(payload);

        if (Number(payload.exit_price)) {
            const leveragedQuantity = payload.leverage ? payload.quantity * payload.leverage : payload.quantity;
            const priceDifference = payload.exit_price - payload.entry_price;
            const pnl =
                payload.type === "buy" ? priceDifference * leveragedQuantity : -priceDifference * leveragedQuantity;

            await User.updateBalance(user._id, payload.base_currency, pnl - fees);
        } else {
            await User.updateBalance(user._id, payload.base_currency, -payload.base_currency_amount);
        }

        await newPosition.save();

        return res.json({
            success: true,
            data: { ...newPosition.position, user },
        });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json({ success: false, message: e.message });
    }
};

export const adminDeletePosition = async (req: Request, res: Response) => {
    try {
        const position_id = req.params.id;

        const position = await Position.findOneById(new ObjectId(position_id));

        if (position.status === "open") {
            await User.updateBalance(position.user_id, position.base_currency, position.base_currency_amount);
        }

        await Position.deleteOneById(new ObjectId(position_id));

        return res.json({ success: true, data: position });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json({ success: false, message: e.message });
    }
};

export const adminCreatePositions = async (req: Request, res: Response) => {
    try {
        const positions = req.body;
        const createdPositions = [];

        for (const positionData of positions) {
            const {
                user_id,
                symbol,
                manual_symbol,
                quantity,
                entry_time,
                entry_price,
                exit_time,
                exit_price,
                base_currency,
                base_currency_amount,
                status,
                type,
                leverage,
                liquidation_price,
                position_size,
                take_profit,
                stop_loss,
            } = positionData;

            const position = new Position({
                user_id: new ObjectId(user_id as string),
                symbol,
                manual_symbol,
                base_currency,
                base_currency_amount,
                quantity,
                entry_price,
                entry_time: new Date(entry_time),
                exit_price,
                exit_time: exit_time ? new Date(exit_time) : null,
                status,
                type,
                leverage,
                liquidation_price,
                position_size,
                take_profit,
                stop_loss,
            });

            const user = await User.findOneById(new ObjectId(user_id as string));
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: `User not found for position. User id: ${user_id}`,
                });
            }

            if (Number(exit_price)) {
                let pnl = (exit_price - entry_price) * quantity;
                if (type === "sell") {
                    pnl = -pnl;
                }
                await User.updateBalance(new ObjectId(user_id as string), base_currency, pnl);
            } else {
                await User.updateBalance(new ObjectId(user_id as string), base_currency, -base_currency_amount);
            }

            await position.save();

            try {
                const emailContent = getOpenPositionEmailContent({
                    symbol: `${symbol}/${base_currency}`,
                    leverage,
                    entryDate: new Date(entry_time),
                    dashboardUrl: process.env.DASHBOARD_URL,
                    logoUrl: process.env.LOGO_URL,
                });

                await invokeEmailSender({
                    to: user.email,
                    subject: "Nouvelle position ouverte",
                    html: emailContent,
                });
            } catch (e: any) {
                console.log("Error sending email", e);
            }

            createdPositions.push({ ...position.position, user });
        }

        return res.json({ success: true, data: createdPositions });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json({ success: false, message: e.message });
    }
};

export const adminUpdatePositions = async (req: Request, res: Response) => {
    try {
        const positions = req.body;
        const updatedPositions = [];

        for (const positionData of positions) {
            const position_id = positionData._id;
            const payload = positionData;

            const position = await Position.findOneById(new ObjectId(position_id));
            const user = await User.findOneById(position.user_id);

            if (position.status === "open") {
                await User.updateBalance(position.user_id, position.base_currency, position.base_currency_amount);
            }

            await Position.deleteOneById(new ObjectId(position._id));

            payload.user_id = new ObjectId(payload.user_id as string);
            delete payload.user;
            payload._id = new ObjectId(position_id);

            const newPosition = new Position(payload);

            if (Number(payload.exit_price)) {
                let pnl = (payload.exit_price - payload.entry_price) * payload.quantity;
                if (payload.type === "sell") {
                    pnl = -pnl;
                }
                await User.updateBalance(user._id, payload.base_currency, pnl);
            } else {
                await User.updateBalance(user._id, payload.base_currency, -payload.base_currency_amount);
            }

            await newPosition.save();
            updatedPositions.push({ ...newPosition.position, user });
        }

        return res.json({ success: true, data: updatedPositions });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json({ success: false, message: e.message });
    }
};

export const getTotalFeesTakenByUser = async (req: Request, res: Response) => {
    const { user } = req;

    const positions = await Position.collection.find({ user_id: user._id }).toArray();

    const fees: Record<string, number> = {};

    for (const position of positions) {
        if (position.fees) {
            fees[position.base_currency] = (fees[position.base_currency] || 0) + position.fees;
        }
    }

    return res.json({ success: true, data: fees });
};

export const adminGetTotalFeesTakenByUser = async (req: Request, res: Response) => {
    const { user_id } = req.params;

    const positions = await Position.collection.find({ user_id: new ObjectId(user_id as string) }).toArray();

    const fees: Record<string, number> = {};

    for (const position of positions) {
        if (position.fees) {
            fees[position.base_currency] = (fees[position.base_currency] || 0) + position.fees;
        }
    }
};
