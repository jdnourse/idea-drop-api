import express from "express";
import User from "../models/User.js";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "../utils/getJwtSecret.js";
import { generateToken } from "../utils/generateToken.js";
const router = express.Router();

// @route   POST /api/auth/register
// @description Register new user
// @access  Public
router.post("/register", async (req, res, next) => {
    try {
        const { name, email, password } = req.body || {};

        if (!name || !email || !password) {
            res.status(400);
            throw new Error("All fields are required");
        }

        const existingUser = await User.findOne({ email: email });

        if (existingUser) {
            res.status(400);
            throw new Error("User already exists");
        }

        const user = await User.create({ name, email, password });

        // Create Tokens
        const payload = { userId: user._id.toString() };
        const accessToken = await generateToken(payload, "1m");
        const refreshToken = await generateToken(payload, "30d");

        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
            accessToken,
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// @route   POST /api/auth/login
// @description Authenticate user
// @access  Public
router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            res.status(400);
            throw new Error("All fields are required");
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            res.status(401);
            throw new Error("Invalid credentials");
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            res.status(401);
            throw new Error("Invalid credentials");
        }

        // Create Tokens
        const payload = { userId: user._id.toString() };
        const accessToken = await generateToken(payload, "1m");
        const refreshToken = await generateToken(payload, "30d");

        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000, // days
        });

        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
            accessToken,
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// @route   POST /api/auth/logout
// @description Logout user and clear refresh token
// @access  Private
router.post("/logout", (req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
    });

    res.status(200).json({ message: "Logged out successfully" });
});

// @route       POST /api/auth/refresh
// @description Generate new access token from refresh token
// @access      Public (Needs valid refresh token in cookie)

router.post("/refresh", async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken;
        console.log("Refreshing token...");
        console.log("Cookie received:", !!token);

        if (!token) {
            res.status(401);
            throw new Error("No refresh token");
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        console.log("Token verified, userId:", payload.userId);
        const user = await User.findById(payload.userId);
        if (!user) {
            res.status(401);
            throw new Error("User not found");
        }

        const newAccessToken = await generateToken(
            { userId: user._id.toString() },
            "1m",
        );

        res.status(200).json({
            accessToken: newAccessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (err) {
        res.status(401);
        next(err);
    }
});

export default router;
