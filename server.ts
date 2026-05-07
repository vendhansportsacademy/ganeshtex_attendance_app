import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { User, Attendance } from "./src/models.js"; 
import { format, parse, differenceInMinutes, isAfter, startOfMonth, endOfMonth } from "date-fns";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION LOGIC ---
const MONGODB_URI = (process.env.MONGODB_URI || "").trim();

// This variable stores the connection state so we don't reconnect every time
let isConnected = false;

async function connectToDatabase() {
  if (isConnected) return;

  try {
    if (!MONGODB_URI) throw new Error("MONGODB_URI is missing in Environment Variables");
    
    // Connect and wait for it to finish
    await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
    });
    
    isConnected = true;
    console.log("✅ Database Connected");
  } catch (err: any) {
    console.error("❌ Database Connection Failed:", err.message);
    throw err; // This will trigger a 500 error instead of a crash
  }
}

// Middleware: EVERY request will wait for the database connection first
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err: any) {
    res.status(503).json({ error: "Database not ready", details: err.message });
  }
});

// --- API ROUTES ---
const api = express.Router();

api.get("/status", (req, res) => {
  res.json({ status: "online", db: isConnected ? "connected" : "connecting" });
});

api.get("/employees", async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" }).sort({ name: 1 });
    res.json(employees || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.post("/attendance/toggle", async (req, res) => {
  const { userName } = req.body;
  const now = new Date();
  const dateStr = format(now, "yyyy-MM-dd");
  try {
    const existing = await Attendance.findOne({ userName, date: dateStr });
    if (existing) {
      if (!existing.checkOut) {
        existing.checkOut = now;
        const diff = differenceInMinutes(now, existing.checkIn);
        existing.workHours = Number((diff / 60).toFixed(2));
        await existing.save();
        return res.json({ status: "checked-out", attendance: existing });
      } else {
        await Attendance.findByIdAndDelete(existing._id);
        return res.json({ status: "absent" });
      }
    } else {
      const officialTime = parse("09:15", "HH:mm", now);
      let status: "Present" | "Late" = isAfter(now, officialTime) ? "Late" : "Present";
      let lateMinutes = isAfter(now, officialTime) ? differenceInMinutes(now, officialTime) : 0;
      const attendance = new Attendance({ userName, date: dateStr, checkIn: now, status, lateMinutes });
      await attendance.save();
      return res.json({ status: "present", attendance });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

api.get("/attendance/today", async (req, res) => {
    try {
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const records = await Attendance.find({ date: dateStr });
      res.json(records);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

api.get("/admin/attendance", async (req, res) => {
  try {
    const records = await Attendance.find().sort({ checkIn: -1 }).limit(100);
    res.json(records);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.use("/api", api);
app.use("/", api);

export default app;