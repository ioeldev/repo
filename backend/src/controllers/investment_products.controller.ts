import { Request, Response } from "express";
import { InvestmentProduct } from "../models/investment_products.model";
import { ObjectId, Binary } from "mongodb";
import { User } from "../models/users.model";
import { UploadedFile } from "express-fileupload";
import { InvestEarnings } from "../models/invest_earnings.model";

// Create a new investment product
export const adminCreateInvestmentProduct = async (req: Request, res: Response) => {
    let {
        category,
        title,
        subtitle,
        description,
        minimum_investment,
        maximum_investment,
        unit_price,
        total_units,
        interest_rate,
        frequency,
        end_date,
        confidence,
        duration,
        interest_levels,
    } = req.body;

    if (interest_levels) {
        interest_levels = JSON.parse(interest_levels);
    }

    if (!req.files) {
        return res.status(400).json({ message: "Image is required" });
    }
    const files = req.files.image;
    const users = await User.findAllClients();

    const newInvestmentProduct = new InvestmentProduct({
        category,
        title,
        subtitle,
        image: new Binary((files as UploadedFile).data),
        description,
        minimum_investment,
        maximum_investment,
        unit_price,
        total_units,
        interest_rate,
        frequency,
        end_date,
        confidence,
        duration,
        interest_levels,
        allowed_users: users.map((user) => user._id),
    });

    try {
        const savedInvestmentProduct = await newInvestmentProduct.save();
        res.json({ success: true, data: savedInvestmentProduct });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all investment products
export const getInvestmentProducts = async (req: Request, res: Response) => {
    try {
        const investmentProducts = await InvestmentProduct.collection.find({}).toArray();

        res.json({ success: true, data: investmentProducts });
    } catch (error) {
        res.status(400).json({ message: error });
    }
};

// Get an investment product by ID
export const getInvestmentProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const investmentProduct = await InvestmentProduct.collection.findOne({
            _id: new ObjectId(id),
        });
        return res.json({ success: true, data: investmentProduct });
    } catch (error) {
        return res.status(400).json({ message: error });
    }
};

// Update an investment product
export const adminUpdateInvestmentProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    let product = req.body;

    if (product.interest_levels) {
        product.interest_levels = JSON.parse(product.interest_levels);
    }

    try {
        const investmentProduct = await InvestmentProduct.collection.findOne({
            _id: new ObjectId(id),
        });

        if (!investmentProduct) {
            return res.status(404).json({ message: "Investment product not found" });
        }

        const payload = {
            ...req.body,
            interest_levels: product.interest_levels,
        };
        if (req.files) {
            const files = req.files.image;
            payload.image = new Binary((files as UploadedFile).data);
        }

        const updatedInvestmentProduct = await InvestmentProduct.collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            {
                $set: payload,
            },
            { returnDocument: "after" },
        );

        return res.json({ success: true, data: updatedInvestmentProduct });
    } catch (error) {
        return res.status(400).json({ message: error });
    }
};

export const adminUpdateAllowedUsersForProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { allowed_users } = req.body;
    try {
        const investmentProduct = await InvestmentProduct.collection.findOne({
            _id: new ObjectId(id),
        });

        if (!investmentProduct) {
            return res.status(404).json({ message: "Investment product not found" });
        }

        const updatedInvestmentProduct = await InvestmentProduct.collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            {
                $set: {
                    allowed_users: allowed_users.map((id: string) => new ObjectId(id)),
                },
            },
            { returnDocument: "after" },
        );

        return res.json({ success: true, data: updatedInvestmentProduct });
    } catch (error) {
        return res.status(400).json({ message: error });
    }
};

// Delete an investment product
export const adminDeleteInvestmentProduct = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        await InvestmentProduct.collection.deleteOne({ _id: new ObjectId(id) });

        return res.json({ success: true, data: id });
    } catch (error) {
        return res.status(400).json({ success: false, message: error });
    }
};

// Request to invest in a product
export const requestToInvest = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { requested_amount } = req.body;
    const user_id = req.user._id;

    try {
        const user = await User.findOneById(new ObjectId(user_id));
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const result = await User.collection.findOneAndUpdate(
            { _id: new ObjectId(user_id) },
            {
                $push: {
                    invest_requests: {
                        _id: new ObjectId(),
                        created_at: new Date(),
                        product_id: new ObjectId(id),
                        requested_amount,
                        type: "invest",
                    },
                },
            },
            { returnDocument: "after" },
        );
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

// Add investment product to user
export const addProductToUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { product_id, user_id, amount, joined_at, duration } = req.body;
    try {
        const user = await User.findOneById(new ObjectId(user_id as string));
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }
        const product = await InvestmentProduct.collection.findOne({
            _id: new ObjectId(product_id as string),
        });

        if (!product) {
            return res.status(400).json({ success: false, message: "Product not found" });
        }

        const result = await User.collection.findOneAndUpdate(
            { _id: new ObjectId(user_id as string) },
            {
                $push: {
                    joined_products: {
                        _id: new ObjectId(id),
                        product_id: new ObjectId(product_id as string),
                        joined_at: joined_at ? new Date(joined_at) : new Date(),
                        balance: amount,
                        initial_balance: amount,
                        duration: duration ? duration : product.duration,
                    },
                },
                $pull: {
                    invest_requests: { _id: new ObjectId(id) },
                },
                $inc: {
                    invest_balance: -amount,
                },
            },
            { returnDocument: "after" },
        );
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

// Add funds to investment product
export const addFundsToProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user_id, amount } = req.body;
    try {
        const user = await User.findOneById(new ObjectId(user_id as string));
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const result = await User.collection.findOneAndUpdate(
            {
                _id: new ObjectId(user_id as string),
                "joined_products.product_id": new ObjectId(id),
            },
            {
                $inc: {
                    "joined_products.$.balance": amount,
                    invest_balance: -amount,
                },
                $pull: {
                    invest_requests: { product_id: new ObjectId(id) },
                },
            },
            { returnDocument: "after" },
        );

        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

// Remove investment product from user
export const removeProductFromUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user_id } = req.body;
    try {
        const user = await User.findOneById(new ObjectId(user_id as string));
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }
        const product = user.joined_products.find((p) => p._id.equals(id));
        if (!product) {
            return res
                .status(400)
                .json({ success: false, message: "Product not found in user joined products" });
        }
        const investEarnings = await InvestEarnings.findAllByUserId(
            new ObjectId(user_id as string),
        );
        const balanceToIncrement = investEarnings.reduce((acc, earning) => {
            if (earning.joined_product_id.equals(new ObjectId(id)) && !earning.isWithdrawn) {
                return acc + earning.amount;
            }
            return acc;
        }, 0);

        const result = await User.collection.findOneAndUpdate(
            { _id: new ObjectId(user_id as string) },
            {
                $pull: {
                    joined_products: { _id: new ObjectId(id) },
                },
                $inc: {
                    invest_balance: product.initial_balance + balanceToIncrement,
                },
            },
            { returnDocument: "after" },
        );

        // Set isWithdrawn to true for all earnings related to this joined_product
        await InvestEarnings.collection.updateMany(
            {
                joined_product_id: new ObjectId(id),
                user_id: new ObjectId(user_id as string),
            },
            {
                $set: { isWithdrawn: true },
            },
        );

        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

// Cancel investment product from user
export const cancelProductForUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user_id } = req.body;
    try {
        const user = await User.findOneById(new ObjectId(user_id as string));
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }
        const product = user.joined_products.find((p) => p._id.equals(id));
        if (!product) {
            return res
                .status(400)
                .json({ success: false, message: "Product not found in user joined products" });
        }

        const result = await User.collection.findOneAndUpdate(
            { _id: new ObjectId(user_id as string) },
            {
                $pull: {
                    joined_products: { _id: new ObjectId(id) },
                },
                $inc: {
                    invest_balance: product.initial_balance,
                },
            },
            { returnDocument: "after" },
        );
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

// Remove investment product request from user
export const removeProductRequestFromUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user_id }: { user_id: string } = req.body;
    try {
        const user = await User.findOneById(new ObjectId(user_id as string));
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }
        const result = await User.collection.findOneAndUpdate(
            { _id: new ObjectId(user_id) },
            {
                $pull: {
                    invest_requests: { _id: new ObjectId(id) },
                },
            },
            { returnDocument: "after" },
        );
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};
