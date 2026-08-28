import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Resolve .env from project root regardless of CWD (works in both dev/tsx and node dist/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export function createApp() {
  const app = express();
  
  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  return app;
}
