import { Collection, ObjectId } from "mongodb";
import { db } from "../config/db";

export enum InvestProductCategory {
    LIVRET = "savingFunds",
    BOURSE = "bourse",
    REALESTATE = "realEstate",
    PARKING = "parking",
    STUDENT = "students",
}

export enum Frequency {
    DAILY = "daily",
    MONTHLY = "monthly",
    TRIMESTRAL = "trimestral",
    ANNUAL = "annual",
}

export type InterestLevel = {
    level: number;
    interest_rate: number;
};

export type InvestmentProductModel = {
    _id?: ObjectId;
    category: InvestProductCategory;
    title: string;
    subtitle: string;
    description: string;
    minimum_investment: number;
    maximum_investment: number;
    unit_price: number;
    total_units: number;
    interest_rate: number;
    frequency: Frequency;
    end_date: Date;
    confidence: number;
    duration: number; // in months
    created_at?: Date;
    updated_at?: Date;
    interest_levels: InterestLevel[];
    image: any;
    allowed_users?: ObjectId[];
};

export class InvestmentProduct {
    investment_product: InvestmentProductModel;
    static collection: Collection<InvestmentProductModel> = db.collection("investment_products");

    constructor(investment_product: InvestmentProductModel) {
        this.investment_product = investment_product;
    }

    async save() {
        this.investment_product.created_at = new Date();

        await InvestmentProduct.collection.insertOne(this.investment_product);

        return this.investment_product;
    }

    static async findAll() {
        return await InvestmentProduct.collection.find().toArray();
    }

    static async findManyByIds(ids: ObjectId[]) {
        return await InvestmentProduct.collection.find({ _id: { $in: ids } }).toArray();
    }
}
