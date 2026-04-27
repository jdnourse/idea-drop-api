import dotenv from "dotenv";
dotenv.config();

// Decode base64 secret into Uint8Array
export const JWT_SECRET = Buffer.from(process.env.JWT_SECRET, "base64");
