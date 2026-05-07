import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
// IMPORTANT: .js extension is required for Vercel
import { User, Attendance } from "./src/models.js"; 
import { format, parse, differenceInMinutes, isAfter, startOfMonth, endOfMonth } from "date-fns";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Robust MongoDB Connection
const rawUri = process.env.MONGODB_URI || "mongodb+srv://ganeshtex:ganeshtex123@cluster0.0a3heot.mongodb.net/?appName=Cluster0";
const MONGODB_URI = rawUri.trim(); // Removes accidental spaces

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err.message));

// 2. Define All API Routes
const api = express.Router();

// Status/Health Check
api.get("/status", (req, res) => {
  res.json({ status: "online", db: mongoose.connection.readyState === 1 ? "connected" : "connecting" });
});

api.get("/health", (req, res) => res.json({ status: "ok" }));

// Employees
api.get("/employees", async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" }).sort({ name: 1 });
    res.json(employees || []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

api.post("/employees", async (req, res) => {
  try {
    const employee = new User({ ...req.body, role: "employee" });
    await employee.save();
    res.json(employee);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Attendance Logic
api.get("/attendance/today", async (req, res) => {
  const dateStr = format(new Date(), "yyyy-MM-dd");
  try {
    const records = await Attendance.find({ date: dateStr });
    res.json(records);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
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

// Admin Routes
api.get("/admin/attendance", async (req, res) => {
  try {
    const records = await Attendance.find().sort({ checkIn: -1 }).limit(200);
    res.json(records);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

api.get("/admin/reports/monthly", async (req, res) => {
  const { month } = req.query;
  try {
    const targetDate = month ? parse(String(month), "yyyy-MM", new Date()) : new Date();
    const records = await Attendance.find({
      checkIn: { $gte: startOfMonth(targetDate), $lte: endOfMonth(targetDate) }
    }).sort({ checkIn: -1 });
    res.json(records);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// 3. Dual-Mounting to prevent 404s
app.use("/api", api);
app.use("/", api);

export default app;