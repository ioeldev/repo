import { Robot } from "../models/robots.model";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { User } from "../models/users.model";

export const getAllRobots = async (req: Request, res: Response) => {
    try {
        const result = await Robot.findAll();
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ message: err.message });
    }
};

export const createRobot = async (req: Request, res: Response) => {
    try {
        const { apy, name, month_duration, min_entry_price, max_entry_price, level_bg } = req.body;

        const robot = new Robot({
            apy,
            name,
            month_duration,
            min_entry_price,
            max_entry_price,
            level_bg,
        });

        const result = await robot.save();

        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

export const updateRobot = async (req: Request, res: Response) => {
    const { id } = req.params;
    const payload = req.body;
    delete payload._id;
    try {
        const result = await Robot.updateOneById(new ObjectId(id), payload);
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

export const deleteRobot = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await Robot.deleteOneById(new ObjectId(id));
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

export const requestToJoinRobot = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { requested_amount, type } = req.body;

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
                    robots_requests: {
                        robot_id: new ObjectId(id),
                        requested_amount,
                        type,
                        created_at: new Date(),
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

export const addRobotToUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user_id, amount } = req.body;
    try {
        const user = await User.findOneById(new ObjectId(user_id as string));
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }
        const result = await User.collection.findOneAndUpdate(
            { _id: new ObjectId(user_id as string) },
            {
                $push: {
                    joined_robots: {
                        robot_id: new ObjectId(id),
                        joined_at: new Date(),
                        balance: amount,
                        initial_balance: amount,
                    },
                },
                $pull: {
                    robots_requests: { robot_id: new ObjectId(id) },
                },
                $inc: {
                    robots_balance: -amount,
                },
            },
            { returnDocument: "after" },
        );
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

export const addFundsToRobot = async (req: Request, res: Response) => {
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
                "joined_robots.robot_id": new ObjectId(id),
            },
            {
                $inc: {
                    "joined_robots.$.balance": amount,
                    robots_balance: -amount,
                },
                $pull: {
                    robots_requests: { robot_id: new ObjectId(id) },
                },
            },
            { returnDocument: "after" },
        );

        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

export const removeRobotFromUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user_id } = req.body;
    try {
        const user = await User.findOneById(new ObjectId(user_id as string));
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }
        const robot = user.joined_robots.find((r) => r.robot_id.equals(id));
        if (!robot) {
            return res
                .status(400)
                .json({ success: false, message: "Robot not found in user joined robots" });
        }

        const result = await User.collection.findOneAndUpdate(
            { _id: new ObjectId(user_id as string) },
            {
                $pull: {
                    joined_robots: { robot_id: new ObjectId(id) },
                },
                $inc: {
                    robots_balance: robot.balance,
                },
            },
            { returnDocument: "after" },
        );
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

export const removeRobotRequestFromUser = async (req: Request, res: Response) => {
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
                    robots_requests: { robot_id: new ObjectId(id) },
                },
            },
            { returnDocument: "after" },
        );
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message });
    }
};
