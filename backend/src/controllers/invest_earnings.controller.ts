import { Request, Response } from "express";
import { InvestEarnings } from "../models/invest_earnings.model";
import { ObjectId } from "mongodb";
import { User } from "../models/users.model";

export const getEarningsByUser = async (req: Request, res: Response) => {
    try {
        const { _id } = req.user;
        const earnings = await InvestEarnings.findAllByUserId(new ObjectId(_id));
        res.json({ success: true, data: earnings });
    } catch (error) {
        res.status(500).send;
    }
};

export const adminGetEarnings = async (req: Request, res: Response) => {
    try {
        const earnings = await InvestEarnings.collection.find().toArray();
        res.json({ success: true, data: earnings });
    } catch (error) {
        res.status(500).send;
    }
};

export const adminCreateEarning = async (req: Request, res: Response) => {
    try {
        const { user_id, joined_product_id, product_id, amount, date, shouldWithdraw } = req.body;
        const earning = new InvestEarnings({
            user_id: new ObjectId(user_id as string),
            joined_product_id: new ObjectId(joined_product_id as string),
            product_id: new ObjectId(product_id as string),
            amount,
            date: new Date(date),
            isWithdrawn: shouldWithdraw,
        });
        await earning.save();
        await User.collection.updateOne(
            {
                _id: new ObjectId(user_id as string),
                "joined_products._id": new ObjectId(joined_product_id as string),
            },
            { $inc: { "joined_products.$.balance": amount } },
        );
        if (shouldWithdraw) {
            // decrement the user's invest_balance
            await User.collection.updateOne(
                { _id: new ObjectId(user_id as string) },
                {
                    $push: {
                        deposits: {
                            _id: new ObjectId(),
                            amount: parseFloat(amount),
                            date: new Date(date),
                            status: "approved",
                            symbol: "EUR",
                        },
                        withdraws: {
                            _id: new ObjectId(),
                            amount: parseFloat(amount),
                            date: new Date(date),
                            status: "approved",
                            symbol: "EUR",
                        },
                    },
                },
            );
        }
        res.json({ success: true, data: earning });
    } catch (error) {
        res.status(500).send;
    }
};

export const adminDeleteEarning = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { shouldDecrement } = req.body;

        const earning = await InvestEarnings.collection.findOne({ _id: new ObjectId(id) });
        if (!earning) {
            return res.status(404).json({ success: false, message: "Earning not found" });
        }
        await InvestEarnings.collection.deleteOne({ _id: new ObjectId(id) });

        if (shouldDecrement) {
            await User.collection.findOneAndUpdate(
                {
                    _id: earning.user_id,
                    "joined_products._id": earning.joined_product_id,
                },
                {
                    $inc: {
                        "joined_products.$.balance": -earning.amount,
                    },
                },
            );
        }
        res.json({ success: true, data: earning });
    } catch (error) {
        res.status(500).send;
    }
};
