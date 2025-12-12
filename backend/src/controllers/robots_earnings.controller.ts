import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { RobotsEarnings } from '../models/robots_earnings.model';

export const getRewardsByUser = async (req: Request, res: Response) => {
    try {
        const { _id } = req.user;
        const rewards = await RobotsEarnings.findAllByUserId(new ObjectId(_id));
        res.json({ success: true, data: rewards });
    } catch (error) {
        res.status(500).send;
    }
};

export const adminGetRewardsByUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const rewards = await RobotsEarnings.findAllByUserId(new ObjectId(userId));
        res.json({ success: true, data: rewards });
    } catch (error) {
        res.status(500).send;
    }
};
