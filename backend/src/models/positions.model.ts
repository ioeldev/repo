import { Collection, ObjectId } from "mongodb";
import { db } from "../config/db";

export type PositionsModel = {
    _id?: ObjectId;
    created_at?: Date;
    updated_at?: Date;
    user_id: ObjectId;
    symbol: string;
    manual_symbol: string;
    base_currency: string;
    base_currency_amount: number;
    quantity: number;
    entry_price: number;
    entry_time: Date;
    exit_price?: number;
    exit_time?: Date;
    status: "open" | "closed";
    type: "buy" | "sell";
    leverage?: number;
    liquidation_price?: number;
    position_size?: number;
    liquidated?: boolean;
    take_profit?: number;
    stop_loss?: number;
    fees?: number;
};

export class Position {
    position: PositionsModel;
    static collection: Collection<PositionsModel> = db.collection("positions");

    constructor(position: PositionsModel) {
        this.position = position;
    }

    async save() {
        this.position.created_at = new Date();

        await Position.collection.insertOne(this.position);

        return this.position;
    }

    async insertMany(positions: PositionsModel[]) {
        const now = new Date();
        positions.forEach((position) => {
            position.created_at = now;
        });

        await Position.collection.insertMany(positions);

        return positions;
    }

    static async findOneById(id: ObjectId) {
        return await Position.collection.findOne({
            _id: id,
        });
    }

    static async findAllByUserId(user_id: ObjectId, filter: Partial<PositionsModel> = {}) {
        return await Position.collection
            // .aggregate([
            //     {
            //         $match: {
            //             user_id,
            //             ...filter,
            //         },
            //     },
            //     {
            //         $lookup: {
            //             from: "users", // The target collection with which to join.
            //             localField: "user_id", // The field from the input documents (positions).
            //             foreignField: "_id", // The field from the documents of the "from" collection (users).
            //             as: "user", // The array field added to input documents; contains the matching documents from the "from" collection.
            //         },
            //     },
            //     {
            //         $unwind: {
            //             path: "$user",
            //             preserveNullAndEmptyArrays: true, // Optional: set to true if you want to keep positions without a corresponding user.
            //         },
            //     },
            //     {
            //         $sort: {
            //             // Add sorting stage here
            //             entry_time: -1, // Sorting by entry_time in ascending order (1 for ascending, -1 for descending)
            //         },
            //     },
            // ])
            .find({
                user_id,
                ...filter,
            })
            .toArray();
    }

    static async findAll(filter: Partial<PositionsModel> = {}) {
        return await Position.collection
            .aggregate([
                {
                    $match: filter,
                },
                {
                    $lookup: {
                        from: "users", // The target collection with which to join.
                        localField: "user_id", // The field from the input documents (positions).
                        foreignField: "_id", // The field from the documents of the "from" collection (users).
                        as: "user", // The array field added to input documents; contains the matching documents from the "from" collection.
                    },
                },
                {
                    $unwind: {
                        path: "$user",
                        preserveNullAndEmptyArrays: true, // Optional: set to true if you want to keep positions without a corresponding user.
                    },
                },
                {
                    $sort: {
                        // Add sorting stage here
                        entry_time: -1, // Sorting by entry_time in ascending order (1 for ascending, -1 for descending)
                    },
                },
            ])
            .toArray();
    }

    static async updateOneById(id: ObjectId, payload: Partial<PositionsModel>) {
        return await Position.collection.findOneAndUpdate(
            {
                _id: id,
            },
            {
                $set: payload,
            },
            {
                returnDocument: "after",
            }
        );
    }

    static async deleteOneById(id: ObjectId) {
        return await Position.collection.deleteOne({
            _id: id,
        });
    }

    static async deleteManyByIds(ids: ObjectId[]) {
        return await Position.collection.deleteMany({
            _id: { $in: ids },
        });
    }
}
