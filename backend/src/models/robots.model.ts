import { Collection, ObjectId } from 'mongodb';
import { db } from '../config/db';

export type RobotsModel = {
    _id?: ObjectId;
    created_at?: Date;
    updated_at?: Date;
    name: string;
    month_duration: number;
    apy: number;
    min_entry_price: number;
    max_entry_price: number;
    level_bg: 'gold' | 'silver' | 'bronze' | 'black';
};

export class Robot {
    robot: RobotsModel;
    static collection: Collection<RobotsModel> = db.collection('robots');

    constructor(robot: RobotsModel) {
        this.robot = robot;
    }

    async save() {
        this.robot.created_at = new Date();

        await Robot.collection.insertOne(this.robot);

        return this.robot;
    }

    static async findOneById(id: ObjectId) {
        return await Robot.collection.findOne({
            _id: id,
        });
    }

    static async findManyByIds(ids: ObjectId[]) {
        return await Robot.collection
            .find({
                _id: {
                    $in: ids,
                },
            })
            .toArray();
    }

    static async findAll() {
        return await Robot.collection.find().toArray();
    }

    static async updateOneById(id: ObjectId, update: Partial<RobotsModel>) {
        return await Robot.collection.findOneAndUpdate(
            {
                _id: id,
            },
            {
                $set: update,
            },
            {
                returnDocument: 'after',
            },
        );
    }

    static async deleteOneById(id: ObjectId) {
        return await Robot.collection.findOneAndDelete({
            _id: id,
        });
    }
}
