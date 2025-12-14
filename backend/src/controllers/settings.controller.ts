import { Request, Response } from "express";
import { Settings, SettingsKeys } from "../models/settings.model";
import { Binary } from "mongodb";
import { UploadedFile } from "express-fileupload";

export const getLoginBackground = async (req: Request, res: Response) => {
  try {
    const loginBackground = await Settings.findOneByKey(
      SettingsKeys.LOGIN_BACKGROUND
    );
    return res.json({
      success: true,
      data: loginBackground,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateLoginBackground = async (req: Request, res: Response) => {
  try {
    if (!req.files) {
      return res.status(400).json({ message: "Image is required" });
    }
    const files = req.files.image;
    console.log(files);

    const loginBackground = await Settings.collection.findOneAndUpdate(
      { key: SettingsKeys.LOGIN_BACKGROUND },
      { $set: { value: new Binary((files as UploadedFile).data) } },
      { returnDocument: "after", upsert: true }
    );
    return res.json({
      success: true,
      data: loginBackground,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteLoginBackground = async (req: Request, res: Response) => {
  try {
    await Settings.collection.deleteOne({ key: SettingsKeys.LOGIN_BACKGROUND });
    return res.json({
      success: true,
      message: "Login background deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
