import { Request, Response } from "express";
import { User, UsersModel } from "../models/users.model";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { InvestmentProduct } from "../models/investment_products.model";
import { calculateDashboardSummary } from "../services/dashboard.service";

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOneByEmail(email);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: `L'email que vous avez entré n'est associé à aucun compte`,
            });
        }

        const isMatch = await User.comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Le mot de passe que vous avez entré est incorrect",
            });
        }

        const payload: Partial<UsersModel> = {
            last_login: new Date(),
        };

        if (!user.tokenVersion) {
            payload.tokenVersion = 0;
        }

        const updatedUser = await User.updateById(user._id, payload);
        const token = User.generateToken(user);

        delete user.password;

        return res.json({ user: updatedUser, token });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json(e.message);
    }
};

export const signup = async (req: Request, res: Response) => {
    try {
        const { email, password, firstName, lastName, phone, address, role } = req.body;
        // const hashed_password = await bcrypt.hash(password, 10);

        const user = new User({
            email,
            // password: hashed_password,
            password,
            first_name: firstName,
            last_name: lastName,
            address,
            phone,
            role,
            balances: [
                {
                    name: "Bitcoin",
                    symbol: "BTC",
                    balance: 0,
                },
                {
                    name: "Tether",
                    symbol: "USDT",
                    balance: 0,
                },
                {
                    name: "Euros",
                    symbol: "EUR",
                    balance: 0,
                },
            ],
            robots_balance: 0,
            invest_balance: 0,
            deposits: [],
            withdraws: [],
            joined_robots: [],
            joined_products: [],
            invest_requests: [],
            robots_requests: [],
            risk_level: 0,
            assigned_to: req.user._id,
            tokenVersion: 0,
            messages: [],
        });

        const token = User.generateToken(user.user);

        await user.save();

        // add user to allowed_users of all investment products
        await InvestmentProduct.collection.updateMany({}, { $push: { allowed_users: user.user._id } });

        return res.json({ token });
    } catch (e) {
        console.log(e);
        return res.status(400).json(e);
    }
};

export const get_me = async (req: Request, res: Response) => {
    try {
        const user = await User.findOneByEmail(req.user.email);
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        const tokenFromHeader = req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(tokenFromHeader, process.env.JWT_SECRET as string);
        const impersonate = (decoded as any).impersonate;
        const token = User.generateToken(user, impersonate);

        delete user.password;

        return res.json({ success: true, data: { user, token } });
    } catch (e) {
        console.log(e);
        return res.status(400).json(e);
    }
};

export const impersonate = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const user = await User.findOneById(new ObjectId(userId));
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const token = User.generateToken(user, true);
        return res.json({ success: true, data: { user, token } });
    } catch (e: any) {
        console.log(e);
        return res.status(400).json({ success: false, message: e.message });
    }
};

export const refresh_token = async (req: Request, res: Response) => {
    const { refresh_token } = req.body;
    try {
        const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET as string);
        const user = await User.findOneByEmail((decoded as any).email);
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        console.log("decoded on refresh_token", decoded);
        if ((decoded as any).impersonate) {
            await User.updateById(user._id, { last_login: new Date() });
        }
        const shouldImpersonate = (decoded as any).impersonate;
        delete user.password;
        const newToken = User.generateToken(user, shouldImpersonate);
        return res.json({ token: newToken });
    } catch (e) {
        console.log(e);
        return res.status(400).json(e);
    }
};

export const get_dashboard_summary = async (req: Request, res: Response) => {
    try {
        const user = await User.findOneByEmail(req.user.email);
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Calculate dashboard summary
        const summary = await calculateDashboardSummary(user);

        // Get token
        delete user.password;

        return res.json({
            success: true,
            data: {
                summary,
            },
        });
    } catch (e) {
        console.log(e);
        return res.status(400).json(e);
    }
};
