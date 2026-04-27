import { jwtVerify } from "jose";
import dotenv from "dotenv";
import User from "../models/User.js";
import { JWT_SECRET } from "../utils/getJwtSecret.js";

dotenv.config();

export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401);
            throw new Error("Not authorized; not token");
        }

        const token = authHeader.split(" ")[1];
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const user = await User.findById(payload.userId).select(
            "_id name email",
        );

        if (!user) {
            res.status(401);
            throw new Error("User not found");
        }
        req.user = user;
        next();
    } catch (err) {
        console.log(err);
        res.status(401);
        throw new Error("Not authorized; invalid token");
    }
};
