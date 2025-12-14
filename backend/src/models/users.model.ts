import { Collection, ObjectId } from "mongodb";
import { db } from "../config/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export type Balance = {
    name: string;
    symbol: string;
    balance: number;
};

export type Deposit = {
    _id: ObjectId;
    amount: number;
    symbol: string;
    date: Date;
    status: "pending" | "approved" | "declined" | "canceled";
};

export type Withdraw = Deposit;

export type JoinedRobot = {
    robot_id: ObjectId;
    joined_at: Date;
    balance: number;
    initial_balance: number;
};

export type JoinedProduct = {
    _id: ObjectId;
    product_id: ObjectId;
    joined_at: Date;
    balance: number;
    initial_balance: number;
    duration: number;
};

export type RobotsRequest = {
    created_at: Date;
    robot_id: ObjectId;
    requested_amount: number;
    type: "add_funds" | "join";
};

export type InvestRequest = {
    _id: ObjectId;
    created_at: Date;
    product_id: ObjectId;
    requested_amount: number;
    type: "add_funds" | "invest";
};

export type Address = {
    address: string;
    postal_code: string;
    city: string;
    country: string;
};

export type Message = {
    _id: ObjectId;
    from: ObjectId;
    to: ObjectId;
    message: string;
    date: Date;
    is_opened: boolean;
};

export type UsersModel = {
    _id?: ObjectId;
    created_at?: Date;
    updated_at?: Date;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    address: Address;
    role: string;
    phone: string;
    balances: Balance[];
    deposits: Deposit[];
    withdraws: Withdraw[];
    joined_robots: JoinedRobot[];
    robots_requests: RobotsRequest[];
    robots_balance: number;
    joined_products: JoinedProduct[];
    invest_balance: number;
    invest_requests: InvestRequest[];
    risk_level: number;
    assigned_to?: ObjectId;
    last_login?: Date;
    tokenVersion: number;
    messages: Message[];
    custom_message?: string;
    bank_info?: {
        account_holder: string;
        iban: string;
        bic: string;
    };
    fee_percentage?: number;
    max_leverage?: number;
};

export class User {
    user: UsersModel;
    static collection: Collection<UsersModel> = db.collection("users");

    constructor(user: UsersModel) {
        this.user = user;
    }

    async save() {
        this.user.created_at = new Date();

        await User.collection.insertOne(this.user);

        return this.user;
    }

    static async findOneById(id: ObjectId) {
        return await User.collection.findOne({
            _id: id,
        });
    }

    static async findAllClients() {
        return await User.collection
            .find({
                role: "client",
            })
            .sort({ created_at: -1 })
            .toArray();
    }

    static async findAllAdmins() {
        return await User.collection
            .find({
                role: "admin",
            })
            .toArray();
    }

    static async findAllDepositsAndWithdraws() {
        const deposits = await User.collection
            .aggregate([
                { $unwind: "$deposits" },
                {
                    $project: {
                        user: {
                            _id: "$_id",
                            first_name: "$first_name",
                            last_name: "$last_name",
                            email: "$email",
                            phone: "$phone",
                            balances: "$balances",
                        },
                        amount: "$deposits.amount",
                        date: "$deposits.date",
                        symbol: "$deposits.symbol",
                        status: "$deposits.status",
                        _id: "$deposits._id",
                    },
                },
            ])
            .toArray();

        const withdraws = await User.collection
            .aggregate([
                { $unwind: "$withdraws" },
                {
                    $project: {
                        user: {
                            _id: "$_id",
                            first_name: "$first_name",
                            last_name: "$last_name",
                            email: "$email",
                            phone: "$phone",
                            balances: "$balances",
                        },
                        amount: "$withdraws.amount",
                        date: "$withdraws.date",
                        symbol: "$withdraws.symbol",
                        status: "$withdraws.status",
                        _id: "$withdraws._id",
                    },
                },
            ])
            .toArray();

        return {
            deposits: deposits,
            withdraws: withdraws,
        };
    }

    static async findOneByEmail(email: string) {
        return await User.collection.findOne({
            email,
        });
    }

    static async updateById(id: ObjectId, payload: Partial<UsersModel>, updateToken = false) {
        console.log(payload);
        return await User.collection.findOneAndUpdate(
            {
                _id: id,
            },
            {
                $set: payload,
                ...(updateToken && { $inc: { tokenVersion: 1 } }),
            },
            {
                returnDocument: "after",
            }
        );
    }

    static async updateBalance(user_id: ObjectId, currency: string, amount: number) {
        // Use aggregation pipeline update to ensure balance never goes below 0
        return await User.collection.findOneAndUpdate(
            {
                _id: user_id,
                "balances.symbol": currency,
            },
            [
                {
                    $set: {
                        balances: {
                            $map: {
                                input: "$balances",
                                as: "bal",
                                in: {
                                    $cond: {
                                        if: { $eq: ["$$bal.symbol", currency] },
                                        then: {
                                            symbol: "$$bal.symbol",
                                            balance: {
                                                $max: [0, { $add: ["$$bal.balance", amount] }],
                                            },
                                        },
                                        else: "$$bal",
                                    },
                                },
                            },
                        },
                    },
                },
            ],
            {
                returnDocument: "after",
            }
        );
    }

    static async updateRobotBalance(user_id: ObjectId, amount: number) {
        return await User.collection.findOneAndUpdate(
            {
                _id: user_id,
            },
            {
                $inc: { robots_balance: amount },
            },
            {
                returnDocument: "after",
            }
        );
    }

    static async updateInvestBalance(user_id: ObjectId, amount: number) {
        return await User.collection.findOneAndUpdate(
            {
                _id: user_id,
            },
            {
                $inc: { invest_balance: amount },
            },
            {
                returnDocument: "after",
            }
        );
    }

    static async createBalance(user_id: ObjectId, currency: string, amount: number, name: string) {
        return await User.collection.findOneAndUpdate(
            {
                _id: user_id,
            },
            {
                $push: { balances: { symbol: currency, balance: amount, name: name } },
            },
            {
                returnDocument: "after",
            }
        );
    }

    static async deleteById(id: ObjectId) {
        return await User.collection.findOneAndDelete({
            _id: id,
        });
    }

    static generateToken(user: UsersModel, impersonate = false) {
        const access_token = jwt.sign(
            {
                email: user.email,
                role: user.role,
                _id: user._id,
                tokenVersion: user.tokenVersion,
                impersonate: impersonate,
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "24h",
            }
        );

        const refresh_token = jwt.sign(
            {
                email: user.email,
                role: user.role,
                _id: user._id,
                tokenVersion: user.tokenVersion,
                impersonate: impersonate,
            },
            process.env.JWT_SECRET as string,
            {}
        );

        return {
            access_token,
            refresh_token,
        };
    }

    // static async comparePassword(password: string, hashedPassword: string) {
    //     return await bcrypt.compare(password, hashedPassword);
    // }
    static async comparePassword(password: string, passwordInDb: string) {
        return password === passwordInDb;
    }
}
