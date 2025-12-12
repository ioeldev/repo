import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

export const client = new MongoClient(uri);

export const connect = async () => {
    await client.connect();
    console.log(`🍃 MongoDB connected on ${uri}`);

    client.on("close", () => {
        console.log("MongoDB connection closed");
    });
};

export const db = client.db(dbName);
