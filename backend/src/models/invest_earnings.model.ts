import { Collection, ObjectId } from "mongodb";
import { db } from "../config/db";

export type InvestEarningModel = {
    _id?: ObjectId;
    created_at?: Date;
    updated_at?: Date;
    product_id: ObjectId;
    joined_product_id: ObjectId;
    user_id: ObjectId;
    amount: number;
    date: Date;
    isWithdrawn?: boolean;
};

export class InvestEarnings {
    invest_earning: InvestEarningModel;
    static collection: Collection<InvestEarningModel> = db.collection("invest_earnings");

    constructor(invest_earning: InvestEarningModel) {
        this.invest_earning = invest_earning;
    }

    async save() {
        this.invest_earning.created_at = new Date();

        await InvestEarnings.collection.insertOne(this.invest_earning);

        return this.invest_earning;
    }

    static async findAllByUserId(user_id: ObjectId) {
        return InvestEarnings.collection
            .aggregate<InvestEarningModel>([
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
