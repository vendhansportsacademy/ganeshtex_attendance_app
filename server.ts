import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
// IMPORTANT: .js extension is required for Vercel/Node ESM
import { User, Attendance } from "./src/models.js"; 
import { format, parse, differenceInMinutes, isAfter, startOfMonth, endOfMonth } from "date-fns";

dotenv.config();

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// 1. Database Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ganeshtex:ganeshtex123@cluster0.0a3heot.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// 2. Define API Router
// Using a separate router prevents path mismatches on Vercel
const api = express.Router();

// Health check
api.get("/health", (req, res) => {
  res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "error" });
});

// Fetch all employees
api.get("/employees", async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" }).sort({ name: 1 });
    res.json(employees || []);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch employees", details: err.message });
  }
});

// Attendance Toggle (Check-in / Check-out)
api.post("/attendance/toggle", async (req, res) => {
  const { userName } = req.body;
  const now = new Date();
  const dateStr = format(now, "yyyy-MM-dd");

  try {
    const existing = await Attendance.findOne({ userName, date: dateStr });
    
    if (existing) {
      if (!existing.checkOut) {
        // Handle Check-out
        existing.checkOut = now;
        const diff = differenceInMinutes(now, existing.checkIn);
        existing.workHours = Number((diff / 60).toFixed(2));
        await existing.save();
        return res.json({ status: "checked-out", attendance: existing });
      } else {
        // If already checked out, toggle off (delete) to mark as absent
        await Attendance.findByIdAndDelete(existing._id);
        return res.json({ status: "absent" });
      }
    } else {
      // Handle Check-in
      const officialTime = parse("09:15", "HH:mm", now);
      let status: "Present" | "Late" = isAfter(now, officialTime) ? "Late" : "Present";
      let lateMinutes = isAfter(now, officialTime) ? differenceInMinutes(now, officialTime) : 0;

      const attendance = new Attendance({ 
        userName, 
        date: dateStr, 
        checkIn: now, 
        status, 
        lateMinutes 
      });
      
      await attendance.save();
      return res.json({ status: "present", attendance });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly Reports
api.get("/admin/reports/monthly", async (req, res) => {
    const { month } = req.query; // format: YYYY-MM
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

// Helper for today's data
api.get("/attendance/today", async (req, res) => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    try {
      const records = await Attendance.find({ date: dateStr });
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
});

// 3. Routing Logic for Vercel
// Mount the router on BOTH paths to fix 404 errors regardless of Vercel routing
app.use("/api", api);
app.use("/", api);

// IMPORTANT: Do NOT use app.listen() or Vite middlewares here. 
// Vercel handles the execution.
export default app;