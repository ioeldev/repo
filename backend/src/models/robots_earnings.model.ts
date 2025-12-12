import { Collection, ObjectId } from "mongodb";
import { db } from "../config/db";

export type RobotEarningModel = {
    _id?: ObjectId;
    created_at?: Date;
    updated_at?: Date;
    robot_id: ObjectId;
    robot_name: string;
    user_id: ObjectId;
    amount: number;
    date: Date;
};

export class RobotsEarnings {
    robot_earning: RobotEarningModel;
    static collection: Collection<RobotEarningModel> = db.collection("robots_earnings");

    constructor(robot_earning: RobotEarningModel) {
        this.robot_earning = robot_earning;
    }

    async save() {
        this.robot_earning.created_at = new Date();

        await RobotsEarnings.collection.insertOne(this.robot_earning);

        return this.robot_earning;
    }

    static async findAllByUserId(user_id: ObjectId) {
        return RobotsEarnings.collection
            .aggregate([
                {
                    $match: { user_id },
                },
                {
                    $sort: { created_at: -1 },
                },
            ])
            .toArray();
    }
}
