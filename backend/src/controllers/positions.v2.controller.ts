import { Request, Response } from "express";
import { Position, PositionsModel } from "../models/positions.model";
import { ObjectId } from "mongodb";
import { User } from "../models/users.model";
import { sendEmail } from "../services/email.service";
import {
  getOpenPositionEmailContent,
  getClosePositionEmailContent,
} from "../utils/email_content";
import {
  calculatePnl as calculatePnlUtil,
  calculatePnlWithFees,
  calculateUnrealizedPnl,
} from "../utils/pnl";
import { liquidationMonitor } from "../services/liquidation-monitor.service";
import axios from "axios";

// Maintenance Margin Rate (default 0.5%)
const MAINTENANCE_MARGIN_RATE = 0.005;

/**
 * Calculate isolated liquidation price using precise formula
 * Based on: LP = Entry Price ± [(Initial Margin - Maintenance Margin) / Quantity] ± (Extra Margin / Quantity)
 */
const calculateIsolatedLiquidationPrice = (
  type: "buy" | "sell",
  entryPrice: number,
  leverage: number,
  marginAllocated: number,
  extraMarginAdded: number = 0,
): number => {
  if (leverage <= 1) {
    return type === "buy" ? 0 : Number.MAX_SAFE_INTEGER;
  }

  // Position Value = Margin × Leverage
  const positionValue = marginAllocated * leverage;

  // Quantity in crypto (e.g., BTC)
  const quantity = positionValue / entryPrice;

  // Initial Margin (what you allocated)
  const initialMargin = marginAllocated;

  // Maintenance Margin (minimum cushion required)
  const maintenanceMargin = positionValue * MAINTENANCE_MARGIN_RATE;

  // Calculate liquidation price
  const marginDifference = (initialMargin - maintenanceMargin) / quantity;
  const extraMarginEffect = extraMarginAdded / quantity;

  if (type === "buy") {
    // Long: LP = Entry Price - (Initial Margin - Maintenance Margin) / Quantity - Extra Margin / Quantity
    return entryPrice - marginDifference - extraMarginEffect;
  } else {
    // Short: LP = Entry Price + (Initial Margin - Maintenance Margin) / Quantity + Extra Margin / Quantity
    return entryPrice + marginDifference + extraMarginEffect;
  }
};

// Wrapper function for backwards compatibility with existing code
const calculatePnl = (
  type: string,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  leverage: number,
): number => {
  return calculatePnlUtil({
    type: type as "buy" | "sell",
    entryPrice,
    exitPrice,
    quantity,
    leverage,
  });
};

const calculateFees = (
  pnl: number,
  feePercentage: number | undefined,
): number => {
  if (pnl > 0 && feePercentage) {
    return (pnl * feePercentage) / 100;
  }
  return 0;
};

const sendPositionEmail = async (
  emailType: "open" | "close",
  user: any,
  positionData: any,
) => {
  try {
    let emailContent, subject;

    if (emailType === "open") {
      emailContent = getOpenPositionEmailContent({
        symbol: `${positionData.symbol}/${positionData.base_currency}`,
        leverage: positionData.leverage,
        entryDate: positionData.entry_time,
        dashboardUrl: process.env.DASHBOARD_URL,
        logoUrl: process.env.LOGO_URL,
      });
      subject = "Nouvelle position ouverte";
    } else {
      emailContent = getClosePositionEmailContent({
        symbol: `${positionData.symbol}/${positionData.base_currency}`,
        baseCurrency: positionData.base_currency,
        quantity: positionData.quantity,
        entryPrice: positionData.entry_price,
        exitPrice: positionData.exit_price,
        type: positionData.type,
        leverage: positionData.leverage || 1,
        pnl: positionData.pnl,
        entryDate: positionData.entry_time,
        exitDate: positionData.exit_time,
        dashboardUrl: process.env.DASHBOARD_URL,
        logoUrl: process.env.LOGO_URL,
      });
      subject = "Position clôturée";
    }

    await sendEmail({
      to: user.email,
      subject,
      html: emailContent,
    });
  } catch (e: any) {
    console.log("Error sending email", e);
  }
};

// Controller functions
export const getMyPositions = async (req: Request, res: Response) => {
  const { user } = req;
  const { page = 1, limit = 50, status } = req.query;

  try {
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: Partial<PositionsModel> = {};
    if (status) {
      filter.status = status as "open" | "closed";
    }

    // Get total count for pagination
    const totalCount = await Position.collection.countDocuments({
      user_id: user._id,
      ...filter,
    });

    // Get paginated positions
    const positions = await Position.collection
      .find({
        user_id: user._id,
        ...filter,
      })
      .sort({ entry_time: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    // Calculate PnL for each position
    const positionsWithPnL = positions.map((position: any) => {
      let pnl = null;

      // Only calculate PnL for closed positions
      if (position.status === "closed" && position.exit_price) {
        const rawPnl = calculatePnl(
          position.type,
          position.entry_price,
          position.exit_price,
          position.quantity,
          position.leverage || 1,
        );

        // Subtract fees if they exist
        pnl = position.fees
          ? parseFloat((rawPnl - position.fees).toFixed(2))
          : parseFloat(rawPnl.toFixed(2));
      }

      return {
        ...position,
        pnl,
      };
    });

    return res.json({
      success: true,
      data: positionsWithPnL,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (e: any) {
    console.log(e);
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const getMyPositionStats = async (req: Request, res: Response) => {
  const { user } = req;

  try {
    // Get all positions for stats calculation
    const positions = await Position.findAllByUserId(user._id);

    // Get current prices from MEXC or other source
    const btcPriceResponse = await axios.get(
      `https://api.mexc.com/api/v3/ticker/price?symbol=BTCUSDT`,
    );
    const btcPrice = parseFloat(
      parseFloat(btcPriceResponse.data.price).toFixed(2),
    );

    // Calculate stats by currency
    const stats = {
      btc: { pnl: 0, openCount: 0, closedCount: 0 },
      usdt: { pnl: 0, openCount: 0, closedCount: 0 },
      eur: { pnl: 0, openCount: 0, closedCount: 0 },
      total: { pnl: 0, pnlInEur: 0, openCount: 0, closedCount: 0 },
    };

    // Calculate performance for each position
    positions.forEach((position) => {
      const currency = position.base_currency.toLowerCase();
      const currencyStats = stats[currency as keyof typeof stats] || {
        pnl: 0,
        openCount: 0,
        closedCount: 0,
      };

      if (position.status === "open") {
        currencyStats.openCount++;
        stats.total.openCount++;
      } else if (position.status === "closed" && position.exit_price) {
        currencyStats.closedCount++;
        stats.total.closedCount++;

        // Calculate PnL
        const pnl = calculatePnl(
          position.type,
          position.entry_price,
          position.exit_price,
          position.quantity,
          position.leverage || 1,
        );

        // Apply fees if they exist
        const netPnl = position.fees
          ? pnl > 0
            ? pnl - position.fees
            : pnl
          : pnl;

        currencyStats.pnl += netPnl;
        stats.total.pnl += netPnl;

        // Convert to EUR for total (assuming euroPrice is passed or fetched)
        if (position.base_currency === "BTC") {
          stats.total.pnlInEur += netPnl * btcPrice; // This should be multiplied by euroPrice too
        } else if (position.base_currency === "USDT") {
          stats.total.pnlInEur += netPnl; // This should be multiplied by euroPrice
        } else {
          stats.total.pnlInEur += netPnl;
        }
      }
    });

    // Normalize stats to 2 decimal places
    const normalizedStats = {
      btc: {
        pnl: parseFloat(stats.btc.pnl.toFixed(2)),
        openCount: stats.btc.openCount,
        closedCount: stats.btc.closedCount,
      },
      usdt: {
        pnl: parseFloat(stats.usdt.pnl.toFixed(2)),
        openCount: stats.usdt.openCount,
        closedCount: stats.usdt.closedCount,
      },
      eur: {
        pnl: parseFloat(stats.eur.pnl.toFixed(2)),
        openCount: stats.eur.openCount,
        closedCount: stats.eur.closedCount,
      },
      total: {
        pnl: parseFloat(stats.total.pnl.toFixed(2)),
        pnlInEur: parseFloat(stats.total.pnlInEur.toFixed(2)),
        openCount: stats.total.openCount,
        closedCount: stats.total.closedCount,
      },
    };

    // Get user's current balances and normalize to 2 decimal places
    const balances = user.balances.reduce(
      (acc, balance) => {
        acc[balance.symbol.toLowerCase()] = parseFloat(
          balance.balance.toFixed(2),
        );
        return acc;
      },
      {} as Record<string, number>,
    );

    return res.json({
      success: true,
      data: {
        stats: normalizedStats,
        balances,
        btcPrice,
        totalPositions: positions.length,
      },
    });
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
      ? Object.entries(filters).reduce(
          (acc, [key, value]) => {
            if (key === "user_id") {
              acc[key] = new ObjectId(value as string);
            } else if (key.includes(".")) {
              acc[key] = { $regex: value, $options: "i" };
            } else if (
              ["entry_price", "exit_price", "quantity", "leverage"].includes(
                key,
              )
            ) {
              acc[key] = Number(value);
            } else if (["entry_time", "exit_time"].includes(key)) {
              acc[key] = new Date(value);
            } else {
              acc[key] = { $regex: value, $options: "i" };
            }
            return acc;
          },
          {} as Record<string, any>,
        )
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
                // IMPORTANT: quantity is already the leveraged position size
                // Don't multiply by leverage again
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
                    $multiply: [{ $toDouble: "$quantity" }, "$$priceDiff"],
                  },
                  else: {
                    $multiply: [
                      { $toDouble: "$quantity" },
                      { $multiply: ["$$priceDiff", -1] },
                    ],
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
        $sort: sortFields.reduce(
          (acc, { field, order }) => {
            acc[field === "pnl" ? "calculatedPnl" : field] = order;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };
      aggregationPipeline.push(sortStage);
    }

    // Add pagination
    aggregationPipeline.push(
      { $skip: parseInt(skip?.toString() || "0") },
      { $limit: parseInt(limit?.toString() || "50") },
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

    const countResult = await Position.collection
      .aggregate(countPipeline)
      .toArray();
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;
    const positions = await Position.collection
      .aggregate(aggregationPipeline)
      .toArray();

    // Calculate PnL for each position
    const positionsWithPnL = positions.map((position: any) => {
      let pnl = null;

      // Only calculate PnL for closed positions
      if (position.status === "closed" && position.exit_price) {
        const rawPnl = calculatePnl(
          position.type,
          position.entry_price,
          position.exit_price,
          position.quantity,
          position.leverage || 1,
        );

        // Subtract fees if they exist
        pnl = position.fees
          ? parseFloat((rawPnl - position.fees).toFixed(2))
          : parseFloat(rawPnl.toFixed(2));
      }

      // Remove the temporary calculatedPnl field used for sorting
      const { calculatedPnl, ...positionWithoutCalc } = position;

      return {
        ...positionWithoutCalc,
        pnl,
      };
    });

    return res.json({
      success: true,
      data: positionsWithPnL,
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
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const pnl = calculatePnl(
      positionInDb.type,
      positionInDb.entry_price,
      exit_price,
      positionInDb.quantity,
      positionInDb.leverage || 1,
    );

    const fees = calculateFees(pnl, user.fee_percentage);
    // CRITICAL FIX: Only return the margin (base_currency_amount) + PnL - fees
    // NOT the full position value
    const amountToCredit = positionInDb.base_currency_amount + pnl - fees;

    // Update user's balance
    await User.updateBalance(
      positionInDb.user_id,
      positionInDb.base_currency,
      amountToCredit,
    );

    // Close the position
    await Position.updateOneById(new ObjectId(position._id), {
      exit_price,
      exit_time: new Date(exit_time),
      status: "closed",
      fees: fees > 0 ? fees : undefined,
    });

    // Remove position from liquidation monitor tracking
    liquidationMonitor.removePositionFromTracking(positionInDb);

    // Isolated margin: no need to recalculate other positions

    await sendPositionEmail("close", user, {
      ...positionInDb,
      exit_price,
      exit_time: new Date(exit_time),
      pnl,
    });

    return res.json({
      success: true,
      data: {
        ...position,
        exit_price,
        exit_time,
        status: "closed",
        pnl, // Include PnL in response
      },
    });
  } catch (e: any) {
    console.log(e);
    return res.status(400).json({ success: false, message: e.message });
  }
};

// Simplified createPosition function with isolated margin only
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
      position_size,
      take_profit,
      stop_loss,
      confirmReversal,
    } = req.body;

    // Verify user has sufficient balance
    const userBalance = await User.findOneById(user._id);
    const currencyBalance = userBalance?.balances.find(
      (b) => b.symbol === base_currency,
    );

    if (!currencyBalance || currencyBalance.balance < base_currency_amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance in ${base_currency}`,
      });
    }

    // Isolated margin: Check for existing positions with same symbol
    const existingPositions = await Position.collection
      .find({
        user_id: user._id,
        symbol,
        status: "open",
      })
      .toArray();

    // Separate positions by type
    const sameTypePositions = existingPositions.filter(
      (pos) => pos.type === type,
    );
    const opposingPositions = existingPositions.filter(
      (pos) => pos.type !== type,
    );

    // Check for leverage mismatch with existing positions of same type
    if (sameTypePositions.length > 0) {
      const differentLeveragePosition = sameTypePositions.find(
        (pos) => pos.leverage !== leverage,
      );
      if (differentLeveragePosition) {
        return res.status(400).json({
          success: false,
          message: `You have an existing open position for ${symbol}${base_currency} with ${differentLeveragePosition.leverage}x leverage. Please use the same leverage (${differentLeveragePosition.leverage}x) to create a new position.`,
          leverageMismatch: true,
          existingLeverage: differentLeveragePosition.leverage,
        });
      }
    }

    if (opposingPositions.length > 0 && !confirmReversal) {
      return res.status(400).json({
        success: false,
        message:
          "Cet ordre inversera votre position existante. Veuillez confirmer l'inversion.",
        reversalRequired: true,
      });
    }

    // Handle position reversals if confirmed
    if (opposingPositions.length > 0 && confirmReversal) {
      // Process position reversal logic
      for (const opposingPosition of opposingPositions) {
        const reverseAmount = Math.min(quantity, opposingPosition.quantity);
        const remainingQty = opposingPosition.quantity - reverseAmount;

        // Calculate PNL for the closed portion
        const pnl = calculatePnl(
          opposingPosition.type,
          opposingPosition.entry_price,
          entry_price,
          reverseAmount,
          opposingPosition.leverage || 1,
        );

        const fees = calculateFees(pnl, user.fee_percentage);

        // Calculate amount to credit back to user's balance
        const closingRatio = reverseAmount / opposingPosition.quantity;
        const collateralToReturn =
          opposingPosition.base_currency_amount * closingRatio;
        const amountToCredit = collateralToReturn + pnl - fees;

        // Update user's balance
        await User.updateBalance(user._id, base_currency, amountToCredit);

        if (remainingQty > 0) {
          // Partially close the position
          const remainingCollateral =
            opposingPosition.base_currency_amount * (1 - closingRatio);
          await Position.updateOneById(opposingPosition._id, {
            quantity: remainingQty,
            base_currency_amount: remainingCollateral,
            updated_at: new Date(),
          });
        } else {
          // Fully close the position
          await Position.updateOneById(opposingPosition._id, {
            exit_price: entry_price,
            exit_time: new Date(),
            status: "closed",
            fees: fees > 0 ? fees : undefined,
            updated_at: new Date(),
          });

          // Remove from tracking
          liquidationMonitor.removePositionFromTracking(opposingPosition);

          await sendPositionEmail("close", user, {
            ...opposingPosition,
            exit_price: entry_price,
            exit_time: new Date(),
            pnl,
          });
        }
      }
    }

    // Calculate remaining quantity after reversals
    const quantityUsedInReversals = opposingPositions.reduce(
      (acc, pos) => acc + Math.min(quantity, pos.quantity),
      0,
    );
    const remainingQuantity = quantity - quantityUsedInReversals;
    const remainingCollateral =
      base_currency_amount * (remainingQuantity / quantity);

    // If all quantity was used in reversals, return early
    if (remainingQuantity <= 0) {
      return res.json({
        success: true,
        message: "Position fully reversed existing positions",
      });
    }

    // Check if we have an existing position of the same type and leverage
    // If yes, add margin to it (merge positions)
    if (sameTypePositions.length > 0) {
      const existingPosition = sameTypePositions[0]; // Take the first one (same leverage already verified)

      // Calculate new totals by adding the new margin and quantity
      const newTotalMargin =
        existingPosition.base_currency_amount + remainingCollateral;
      const newTotalQuantity = existingPosition.quantity + remainingQuantity;

      // Calculate new average entry price (weighted average)
      const newAverageEntryPrice =
        (existingPosition.entry_price * existingPosition.quantity +
          entry_price * remainingQuantity) /
        newTotalQuantity;

      // Calculate new position value and initial margin requirement
      const newPositionValue = newTotalQuantity * newAverageEntryPrice;
      const newInitialMarginRequired = newPositionValue / (leverage || 1);

      // Extra margin is anything above the required initial margin
      const extraMargin = newTotalMargin - newInitialMarginRequired;

      // Recalculate liquidation price
      const newLiquidationPrice = calculateIsolatedLiquidationPrice(
        type as "buy" | "sell",
        newAverageEntryPrice,
        leverage || 1,
        newInitialMarginRequired, // New initial margin based on position size
        extraMargin > 0 ? extraMargin : 0, // Only positive extra margin
      );

      // Update the existing position
      await Position.updateOneById(existingPosition._id, {
        base_currency_amount: newTotalMargin,
        quantity: newTotalQuantity,
        entry_price: newAverageEntryPrice,
        liquidation_price: newLiquidationPrice,
        updated_at: new Date(),
      });

      // Deduct the collateral from user's balance
      await User.updateBalance(user._id, base_currency, -remainingCollateral);

      // Get the updated position
      const updatedPosition = await Position.findOneById(existingPosition._id);

      // Update liquidation monitor tracking
      liquidationMonitor.removePositionFromTracking(existingPosition);
      liquidationMonitor.addPositionToTracking(updatedPosition);

      return res.json({
        success: true,
        data: {
          ...updatedPosition,
          user,
        },
        message: "Margin added to existing position",
      });
    }

    // No existing position of same type - create a new position
    const isolatedLiquidationPrice = calculateIsolatedLiquidationPrice(
      type as "buy" | "sell",
      entry_price,
      leverage || 1,
      remainingCollateral,
    );

    const newPosition = new Position({
      user_id: user._id,
      symbol,
      manual_symbol,
      base_currency,
      base_currency_amount: remainingCollateral,
      quantity: remainingQuantity,
      entry_price,
      entry_time: new Date(),
      status: "open",
      type,
      leverage,
      liquidation_price: isolatedLiquidationPrice,
      position_size,
      take_profit,
      stop_loss,
    });

    await User.updateBalance(user._id, base_currency, -remainingCollateral);
    const savedPosition = await newPosition.save();

    // Add position to liquidation monitor tracking
    if (savedPosition.status === "open") {
      liquidationMonitor.addPositionToTracking(savedPosition);
    }

    await sendPositionEmail("open", user, savedPosition);

    return res.json({
      success: true,
      data: {
        ...savedPosition,
        user,
      },
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
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    // Only handle merging/reversal for open positions
    if (status === "open") {
      const existingPositions = await Position.collection
        .find({
          user_id: new ObjectId(user_id as string),
          symbol,
          base_currency,
          status: "open",
        })
        .toArray();

      // Separate positions by type
      const sameTypePositions = existingPositions.filter(
        (pos) => pos.type === type,
      );
      const opposingPositions = existingPositions.filter(
        (pos) => pos.type !== type,
      );

      // Check for leverage mismatch with same type positions
      if (sameTypePositions.length > 0) {
        const differentLeveragePosition = sameTypePositions.find(
          (pos) => pos.leverage !== leverage,
        );
        if (differentLeveragePosition) {
          return res.status(400).json({
            success: false,
            message: `User has an existing open position for ${symbol}${base_currency} with ${differentLeveragePosition.leverage}x leverage. Please use the same leverage (${differentLeveragePosition.leverage}x) to create a new position.`,
            leverageMismatch: true,
            existingLeverage: differentLeveragePosition.leverage,
          });
        }
      }

      // Handle opposing positions (reversal)
      if (opposingPositions.length > 0) {
        for (const opposingPosition of opposingPositions) {
          const reverseAmount = Math.min(quantity, opposingPosition.quantity);
          const remainingQty = opposingPosition.quantity - reverseAmount;

          // Calculate PNL for the closed portion
          const pnl = calculatePnl(
            opposingPosition.type,
            opposingPosition.entry_price,
            entry_price,
            reverseAmount,
            opposingPosition.leverage || 1,
          );

          const fees = calculateFees(pnl, user.fee_percentage);

          // Calculate amount to credit back to user's balance
          const closingRatio = reverseAmount / opposingPosition.quantity;
          const collateralToReturn =
            opposingPosition.base_currency_amount * closingRatio;
          const amountToCredit = collateralToReturn + pnl - fees;

          // Update user's balance
          await User.updateBalance(
            new ObjectId(user_id as string),
            base_currency,
            amountToCredit,
          );

          if (remainingQty > 0) {
            // Partially close the position
            const remainingCollateral =
              opposingPosition.base_currency_amount * (1 - closingRatio);
            await Position.updateOneById(opposingPosition._id, {
              quantity: remainingQty,
              base_currency_amount: remainingCollateral,
              updated_at: new Date(),
            });
          } else {
            // Fully close the position
            await Position.updateOneById(opposingPosition._id, {
              exit_price: entry_price,
              exit_time: new Date(),
              status: "closed",
              fees: fees > 0 ? fees : undefined,
              updated_at: new Date(),
            });

            // Remove from tracking
            liquidationMonitor.removePositionFromTracking(opposingPosition);

            await sendPositionEmail("close", user, {
              ...opposingPosition,
              exit_price: entry_price,
              exit_time: new Date(),
              pnl,
            });
          }
        }
      }

      // Calculate remaining quantity after reversals
      const quantityUsedInReversals = opposingPositions.reduce(
        (acc, pos) => acc + Math.min(quantity, pos.quantity),
        0,
      );
      const remainingQuantity = quantity - quantityUsedInReversals;
      const remainingCollateral =
        base_currency_amount * (remainingQuantity / quantity);

      // If all quantity was used in reversals, return early
      if (remainingQuantity <= 0) {
        return res.json({
          success: true,
          message: "Position fully reversed existing positions",
        });
      }

      // Check if we have an existing position of the same type and leverage
      // If yes, merge (add margin)
      if (sameTypePositions.length > 0) {
        const existingPosition = sameTypePositions[0];

        // Calculate new totals
        const newTotalMargin =
          existingPosition.base_currency_amount + remainingCollateral;
        const newTotalQuantity = existingPosition.quantity + remainingQuantity;

        // Calculate weighted average entry price
        const newAverageEntryPrice =
          (existingPosition.entry_price * existingPosition.quantity +
            entry_price * remainingQuantity) /
          newTotalQuantity;

        // Calculate new position value and initial margin requirement
        const newPositionValue = newTotalQuantity * newAverageEntryPrice;
        const newInitialMarginRequired = newPositionValue / (leverage || 1);

        // Extra margin is anything above the required initial margin
        const extraMargin = newTotalMargin - newInitialMarginRequired;

        // Recalculate liquidation price
        const newLiquidationPrice = calculateIsolatedLiquidationPrice(
          type as "buy" | "sell",
          newAverageEntryPrice,
          leverage || 1,
          newInitialMarginRequired, // New initial margin based on position size
          extraMargin > 0 ? extraMargin : 0, // Only positive extra margin
        );

        // Update the existing position
        await Position.updateOneById(existingPosition._id, {
          base_currency_amount: newTotalMargin,
          quantity: newTotalQuantity,
          entry_price: newAverageEntryPrice,
          liquidation_price: newLiquidationPrice,
          updated_at: new Date(),
        });

        // Deduct collateral from user's balance
        await User.updateBalance(
          new ObjectId(user_id as string),
          base_currency,
          -remainingCollateral,
        );

        // Get updated position
        const updatedPosition = await Position.findOneById(
          existingPosition._id,
        );

        // Update liquidation monitor
        liquidationMonitor.removePositionFromTracking(existingPosition);
        liquidationMonitor.addPositionToTracking(updatedPosition);

        return res.json({
          success: true,
          data: {
            ...updatedPosition,
            user,
          },
          message: "Margin added to existing position",
        });
      }

      // No existing same-type position, create new with remaining quantity
      const calculatedLiquidationPrice = liquidation_price
        ? liquidation_price
        : calculateIsolatedLiquidationPrice(
            type as "buy" | "sell",
            entry_price,
            leverage || 1,
            remainingCollateral,
          );

      const position = new Position({
        user_id: new ObjectId(user_id as string),
        symbol,
        manual_symbol,
        base_currency,
        base_currency_amount: remainingCollateral,
        quantity: remainingQuantity,
        entry_price,
        entry_time: new Date(entry_time),
        status: "open",
        type,
        leverage,
        liquidation_price: calculatedLiquidationPrice,
        position_size,
        take_profit,
        stop_loss,
      });

      await User.updateBalance(
        new ObjectId(user_id as string),
        base_currency,
        -remainingCollateral,
      );

      await position.save();

      liquidationMonitor.addPositionToTracking(position.position);
      await sendPositionEmail("open", user, position.position);

      return res.json({
        success: true,
        data: {
          ...position.position,
          user,
        },
      });
    }

    // Creating a closed position (no merging/reversal needed)
    let fees = 0;
    if (Number(exit_price) && status === "closed") {
      const pnl = calculatePnl(
        type,
        entry_price,
        exit_price,
        quantity,
        leverage || 1,
      );
      fees = calculateFees(pnl, user.fee_percentage);
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
      liquidation_price: liquidation_price || undefined,
      position_size,
      take_profit,
      stop_loss,
      fees: fees > 0 ? fees : undefined,
    });

    // Update user's balance
    if (Number(exit_price)) {
      const pnl = calculatePnl(
        type,
        entry_price,
        exit_price,
        quantity,
        leverage || 1,
      );
      await User.updateBalance(
        new ObjectId(user_id as string),
        base_currency,
        base_currency_amount + pnl - fees,
      );
    } else {
      await User.updateBalance(
        new ObjectId(user_id as string),
        base_currency,
        -base_currency_amount,
      );
    }

    await position.save();

    return res.json({
      success: true,
      data: {
        ...position.position,
        user,
      },
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
      await User.updateBalance(
        position.user_id,
        position.base_currency,
        position.base_currency_amount,
      );
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
      const pnl = calculatePnl(
        payload.type,
        payload.entry_price,
        payload.exit_price,
        payload.quantity,
        payload.leverage || 1,
      );
      fees = calculateFees(pnl, user.fee_percentage);
    }

    payload.fees = fees > 0 ? fees : undefined;

    // Calculate isolated liquidation price for open positions
    if (
      payload.leverage &&
      !payload.liquidation_price &&
      payload.status === "open"
    ) {
      payload.liquidation_price = calculateIsolatedLiquidationPrice(
        payload.type as "buy" | "sell",
        payload.entry_price,
        payload.leverage,
        payload.base_currency_amount,
      );
    }

    const newPosition = new Position(payload);

    if (Number(payload.exit_price)) {
      const pnl = calculatePnl(
        payload.type,
        payload.entry_price,
        payload.exit_price,
        payload.quantity,
        payload.leverage || 1,
      );
      // CRITICAL FIX: Return margin + PnL - fees, not just PnL - fees
      await User.updateBalance(
        user._id,
        payload.base_currency,
        payload.base_currency_amount + pnl - fees,
      );
    } else {
      await User.updateBalance(
        user._id,
        payload.base_currency,
        -payload.base_currency_amount,
      );
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
      await User.updateBalance(
        position.user_id,
        position.base_currency,
        position.base_currency_amount,
      );
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

      const user = await User.findOneById(new ObjectId(user_id as string));
      if (!user) {
        return res.status(400).json({
          success: false,
          message: `User not found for position. User id: ${user_id}`,
        });
      }

      let calculatedLiquidationPrice = liquidation_price;
      if (leverage && !liquidation_price && status === "open") {
        calculatedLiquidationPrice = calculateIsolatedLiquidationPrice(
          type as "buy" | "sell",
          entry_price,
          leverage,
          base_currency_amount,
        );
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
        liquidation_price: calculatedLiquidationPrice,
        position_size,
        take_profit,
        stop_loss,
      });

      if (Number(exit_price)) {
        const pnl = calculatePnl(
          type,
          entry_price,
          exit_price,
          quantity,
          leverage || 1,
        );
        const fees = calculateFees(pnl, user.fee_percentage);
        position.position.fees = fees > 0 ? fees : undefined;
        // CRITICAL FIX: Return margin + PnL - fees, not just PnL - fees
        await User.updateBalance(
          new ObjectId(user_id as string),
          base_currency,
          base_currency_amount + pnl - fees,
        );
      } else {
        await User.updateBalance(
          new ObjectId(user_id as string),
          base_currency,
          -base_currency_amount,
        );
      }

      await position.save();

      if (status === "open") {
        await sendPositionEmail("open", user, position);
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
        await User.updateBalance(
          position.user_id,
          position.base_currency,
          position.base_currency_amount,
        );
      }

      await Position.deleteOneById(new ObjectId(position._id));

      payload.user_id = new ObjectId(payload.user_id as string);
      delete payload.user;
      payload._id = new ObjectId(position_id);

      // Format dates
      if (payload.entry_time) {
        payload.entry_time = new Date(payload.entry_time);
      }
      if (payload.exit_time) {
        payload.exit_time = new Date(payload.exit_time);
      }

      // Calculate fees if needed
      if (Number(payload.exit_price) && payload.status === "closed") {
        const pnl = calculatePnl(
          payload.type,
          payload.entry_price,
          payload.exit_price,
          payload.quantity,
          payload.leverage || 1,
        );
        const fees = calculateFees(pnl, user.fee_percentage);
        payload.fees = fees > 0 ? fees : undefined;
      }

      // Calculate isolated liquidation price for open positions
      if (
        payload.leverage &&
        !payload.liquidation_price &&
        payload.status === "open"
      ) {
        payload.liquidation_price = calculateIsolatedLiquidationPrice(
          payload.type as "buy" | "sell",
          payload.entry_price,
          payload.leverage,
          payload.base_currency_amount,
        );
      }

      const newPosition = new Position(payload);

      if (Number(payload.exit_price)) {
        const pnl = calculatePnl(
          payload.type,
          payload.entry_price,
          payload.exit_price,
          payload.quantity,
          payload.leverage || 1,
        );
        const fees = payload.fees || 0;
        // CRITICAL FIX: Return margin + PnL - fees, not just PnL - fees
        await User.updateBalance(
          user._id,
          payload.base_currency,
          payload.base_currency_amount + pnl - fees,
        );
      } else {
        await User.updateBalance(
          user._id,
          payload.base_currency,
          -payload.base_currency_amount,
        );
      }

      const savedPosition = await newPosition.save();

      // Add position to liquidation monitor tracking if open
      if (payload.status === "open" && savedPosition) {
        liquidationMonitor.addPositionToTracking(savedPosition);
      }

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

  try {
    const positions = await Position.collection
      .find({ user_id: user._id })
      .toArray();
    const fees: Record<string, number> = {};

    for (const position of positions) {
      if (position.fees) {
        fees[position.base_currency] =
          (fees[position.base_currency] || 0) + position.fees;
      }
    }

    return res.json({ success: true, data: fees });
  } catch (e: any) {
    console.log(e);
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const adminGetTotalFeesTakenByUser = async (
  req: Request,
  res: Response,
) => {
  const { user_id } = req.params;

  try {
    const positions = await Position.collection
      .find({ user_id: new ObjectId(user_id as string) })
      .toArray();
    const fees: Record<string, number> = {};

    for (const position of positions) {
      if (position.fees) {
        fees[position.base_currency] =
          (fees[position.base_currency] || 0) + position.fees;
      }
    }

    return res.json({ success: true, data: fees });
  } catch (e: any) {
    console.log(e);
    return res.status(400).json({ success: false, message: e.message });
  }
};

export const getPnLHistory = async (req: Request, res: Response) => {
  const { user } = req;

  try {
    // Get all closed positions for the user, sorted by exit time
    const closedPositions = await Position.collection
      .find({
        user_id: user._id,
        status: "closed",
        exit_time: { $exists: true },
      })
      .sort({ exit_time: 1 })
      .toArray();

    if (closedPositions.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get BTC price for conversion
    const btcPriceResponse = await axios.get(
      `https://api.mexc.com/api/v3/ticker/price?symbol=BTCUSDT`,
    );
    const btcPrice = parseFloat(btcPriceResponse.data.price);

    // Calculate cumulative PnL by date
    const pnlByDate: Record<string, number> = {};
    let cumulativePnL = 0;

    for (const position of closedPositions) {
      // Calculate PnL for this position
      const pnl = calculatePnl(
        position.type,
        position.entry_price,
        position.exit_price!,
        position.quantity,
        position.leverage || 1,
      );

      // Subtract fees if they exist
      const netPnl = position.fees
        ? pnl > 0
          ? pnl - position.fees
          : pnl
        : pnl;

      // Convert to EUR if needed
      let pnlInEur = netPnl;
      if (position.base_currency === "BTC") {
        pnlInEur = netPnl * btcPrice;
      } else if (position.base_currency === "USDT") {
        pnlInEur = netPnl; // Assume 1 USDT ≈ 1 EUR for simplicity
      }

      // Add to cumulative PnL
      cumulativePnL += pnlInEur;

      // Format date as YYYY-MM-DD
      const dateStr = position.exit_time!.toISOString().split("T")[0];

      // Store cumulative PnL for this date
      pnlByDate[dateStr] = cumulativePnL;
    }

    // Convert to array format for the chart
    const chartData = Object.entries(pnlByDate).map(([date, pnl]) => ({
      date,
      pnl: parseFloat(pnl.toFixed(2)),
    }));

    // Add a starting point at 0 if we have data
    if (chartData.length > 0) {
      const firstDate = new Date(chartData[0].date);
      firstDate.setDate(firstDate.getDate() - 1);
      chartData.unshift({
        date: firstDate.toISOString().split("T")[0],
        pnl: 0,
      });
    }

    return res.json({
      success: true,
      data: chartData,
    });
  } catch (e: any) {
    console.log("Error in getPnLHistory:", e);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve P&L history",
      error: e.message,
    });
  }
};
