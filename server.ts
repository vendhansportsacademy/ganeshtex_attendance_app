import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
// IMPORTANT: .js extension is required for Vercel/Node ESM
import { User, Attendance } from "./src/models.js"; 
import { format, parse, differenceInMinutes, isAfter, startOfMonth, endOfMonth } from "date-fns";

dotenv.config();

const app = express();

// 1. Middleware
app.use(cors());
app.use(express.json());

// 2. Robust MongoDB Connection
// We trim the URI to remove any accidental spaces from Vercel settings
const MONGODB_URI = (process.env.MONGODB_URI || "mongodb+srv://ganeshtex:ganeshtex123@cluster0.0a3heot.mongodb.net/?appName=Cluster0").trim();

// Optimization: Disable buffering so the app fails fast if DB is down, 
// instead of hanging for 10 seconds.
mongoose.set('bufferCommands', false);

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
})
.then(() => console.log("✅ MongoDB Connected Successfully"))
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err.message);
  // Log the first few characters of the URI to verify it's loaded correctly
  console.log("URI starts with:", MONGODB_URI.substring(0, 15));
});

// 3. Define All API Routes using a Router
const api = express.Router();

// Health check
api.get("/status", (req, res) => {
  res.json({ 
    status: "online", 
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    time: new Date().toISOString()
  });
});

api.get("/health", (req, res) => res.json({ status: "ok" }));

// --- Employee Management ---
api.get("/employees", async (req, res) => {
  try {
    const employees = await User.find({ role: "employee" }).sort({ name: 1 });
    res.json(employees || []);
  } catch (err: any) {
    res.status(500).json({ error: "DB Error", details: err.message });
  }
});

api.post("/employees", async (req, res) => {
  try {
    const employee = new User({ ...req.body, role: "employee" });
    await employee.save();
    res.json(employee);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Attendance Logic ---
api.get("/attendance/today", async (req, res) => {
  const dateStr = format(new Date(), "yyyy-MM-dd");
  try {
    const records = await Attendance.find({ date: dateStr });
    res.json(records);
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
        // Check-out
        existing.checkOut = now;
        const diff = differenceInMinutes(now, existing.checkIn);
        existing.workHours = Number((diff / 60).toFixed(2));
        await existing.save();
        return res.json({ status: "checked-out", attendance: existing });
      } else {
        // Toggle off (delete)
        await Attendance.findByIdAndDelete(existing._id);
        return res.json({ status: "absent" });
      }
    } else {
      // Check-in
      const officialTime = parse("09:15", "HH:mm", now);
      let status: "Present" | "Late" = isAfter(now, officialTime) ? "Late" : "Present";
      let lateMinutes = isAfter(now, officialTime) ? differenceInMinutes(now, officialTime) : 0;

      const attendance = new Attendance({ 
        userName, date: dateStr, checkIn: now, status, lateMinutes 
      });
      await attendance.save();
      return res.json({ status: "present", attendance });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin & Reports ---
api.get("/admin/attendance", async (req, res) => {
  try {
    const records = await Attendance.find().sort({ checkIn: -1 }).limit(100);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

api.get("/admin/reports/monthly", async (req, res) => {
  const { month } = req.query; // Expects YYYY-MM
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

// 4. Routing logic for Vercel
// Mount the router on both /api and / to prevent 404 errors
app.use("/api", api);
app.use("/", api);

// Export for Vercel serverless environment
export default app;