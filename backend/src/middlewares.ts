// middleware check that user is from role admin
import { NextFunction, Request, Response } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { User } from "./models/users.model";
import { ObjectId } from "mongodb";

export type AuthenticatedRequest = Request & { user: any };

const isAdmin = (user: any) => ["superadmin", "admin"].includes(user.role);

export const onlyAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const { authorization } = req.headers;
    if (!authorization) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authorization.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        if (!isAdmin(decoded)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const { _id, tokenVersion } = decoded as any;
        req.user = await User.findOneById(new ObjectId(_id as string));

        if (req.user.tokenVersion !== tokenVersion) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        next();
    } catch (e: any) {
        if (e instanceof TokenExpiredError) {
            return res.status(401).json({ message: "Token expired" });
        }
        return res.status(401).json({ message: e.message });
    }
};

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    const { authorization } = req.headers;
    if (!authorization) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authorization.split(" ")[1];
    try {
        const { _id, tokenVersion } = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        req.user = await User.findOneById(new ObjectId(_id as string));
        if (req.user.tokenVersion !== tokenVersion) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        next();
    } catch (e: any) {
        if (e instanceof TokenExpiredError) {
            return res.status(401).json({ message: "Token expired" });
        }
        return res.status(401).json({ message: e.message });
    }
};
