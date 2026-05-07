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

// 1. Connection Cache Logic
let isConnected = false;

async function connectToDatabase() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  const URI = (process.env.MONGODB_URI || "mongodb+srv://ganeshtex:ganeshtex123@cluster0.0a3heot.mongodb.net/?appName=Cluster0").trim();
  
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log("✅ Database Connected");
  } catch (err: any) {
    console.error("❌ DB Connection Error:", err.message);
  }
}

// Ensure DB is connected for every request
app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
});

// 2. Define ALL API Routes
const api = express.Router();

// Health & Status (Fixes your /api/health 404)
api.get("/health", (req, res) => res.json({ status: "ok" }));
api.get("/status", (req, res) => res.json({ status: "online", db: isConnected }));

// --- EMPLOYEES ---
api.get("/employees", async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" }).sort({ name: 1 });
    res.json(employees || []);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// THIS ROUTE WAS MISSING (Fixes the "Registering" 404)
api.post("/employees", async (req, res) => {
  try {
    const employee = new User({ ...req.body, role: "employee" });
    await employee.save();
    res.json(employee);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

api.delete("/employees/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- ATTENDANCE ---
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

// --- ADMIN REPORTS ---
api.get("/admin/attendance", async (req, res) => {
  try {
    const records = await Attendance.find().sort({ checkIn: -1 }).limit(100);
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

// 3. Routing: Handle both /api/path and /path
app.use("/api", api);
app.use("/", api);

export default app;