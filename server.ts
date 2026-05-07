import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
// IMPORTANT: Use .js extension for the import to satisfy Node's ESM rules
import { User, Attendance } from "./src/models.js"; 
import { format, parse, differenceInMinutes, isAfter, startOfMonth, endOfMonth } from "date-fns";

dotenv.config();

const app = express();

// Enable CORS for all platforms (Mobile, Web, etc.)
app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ganeshtex:ganeshtex123@cluster0.0a3heot.mongodb.net/?appName=Cluster0";

// Robust Database Connection logic
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// API ROUTES
app.get("/api/health", (req, res) => {
  res.json({ status: "alive", dbState: mongoose.connection.readyState });
});

app.get("/api/employees", async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" }).sort({ name: 1 });
    res.json(employees || []);
  } catch (err: any) {
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

// Admin reports route
app.get("/api/admin/reports/monthly", async (req, res) => {
    const { month } = req.query;
    try {
      const targetDate = month ? parse(String(month), "yyyy-MM", new Date()) : new Date();
      const records = await Attendance.find({
        checkIn: { $gte: startOfMonth(targetDate), $lte: endOfMonth(targetDate) }
      }).sort({ checkIn: -1 });
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
});

// IMPORTANT: Export standard Express app for Vercel
export default app;