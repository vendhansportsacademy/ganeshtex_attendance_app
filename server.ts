import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
// IMPORTANT: No .ts extension here
import { User, Attendance } from "./src/models"; 
import { format, parse, differenceInMinutes, isAfter, startOfMonth, endOfMonth } from "date-fns";

dotenv.config();

const app = express();

// Enable CORS for mobile and web
app.use(cors());
app.use(express.json());

// 1. Use the provided URI, but ensure it's correctly loaded
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ganeshtex:ganeshtex123@cluster0.0a3heot.mongodb.net/?appName=Cluster0";

// 2. Database connection logic (Non-blocking for Vercel)
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 3. API Routes
app.get("/api/status", (req, res) => {
  res.json({ 
    status: "ok", 
    db: mongoose.connection.readyState === 1 ? "connected" : "connecting/error" 
  });
});

app.get("/api/employees", async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" }).sort({ name: 1 });
    res.json(employees || []); // Return empty array instead of null
  } catch (err: any) {
    console.error("Fetch employees error:", err);
    res.status(500).json({ error: "Failed to fetch employees", details: err.message });
  }
});

app.post("/api/attendance/toggle", async (req, res) => {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Route
app.get("/api/admin/attendance", async (req, res) => {
  try {
    const records = await Attendance.find().sort({ checkIn: -1 }).limit(100);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// IMPORTANT: Standard Vercel Export
export default app;