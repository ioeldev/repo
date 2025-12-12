import { Collection, ObjectId } from "mongodb";
import { db } from "../config/db";

export enum SettingsKeys {
  LOGIN_BACKGROUND = "login_background",
}

export type SettingsModel = {
  _id?: ObjectId;
  key: SettingsKeys;
  value: any;
};

export class Settings {
  settings: SettingsModel;
  static collection: Collection<SettingsModel> = db.collection("settings");

  constructor(settings: SettingsModel) {
    this.settings = settings;
  }

  async save() {
    await Settings.collection.insertOne(this.settings);
    return this.settings;
  }

  static async findOneByKey(key: SettingsKeys) {
    return Settings.collection.findOne({ key });
  }

  static async findOneByKeyAndUpdate(key: SettingsKeys, value: string) {
    return Settings.collection.findOneAndUpdate({ key }, { $set: { value } });
  }
}
