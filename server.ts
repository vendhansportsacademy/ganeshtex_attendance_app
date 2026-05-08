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

// Health & Status
api.get("/health", (req, res) => res.json({ status: "ok" }));
api.get("/status", (req, res) => res.json({ status: "online", db: isConnected }));

// --- EMPLOYEES ---
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

api.put("/employees/:id", async (req, res) => {
  try {
    const employee = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
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

api.post("/attendance/checkin", async (req, res) => {
  const { userName } = req.body;
  const now = new Date();
  const dateStr = format(now, "yyyy-MM-dd");
  try {
    const existing = await Attendance.findOne({ userName, date: dateStr });
    if (existing) {
      // Update existing record with new check-in time (latest check-in)
      existing.checkIn = now;
      existing.checkOut = undefined;
      existing.workHours = 0;
      const officialTime = parse("09:15", "HH:mm", now);
      existing.status = isAfter(now, officialTime) ? "Late" : "Present";
      existing.lateMinutes = isAfter(now, officialTime) ? differenceInMinutes(now, officialTime) : 0;
      await existing.save();
      return res.json({ status: "checked-in", attendance: existing });
    } else {
      const officialTime = parse("09:15", "HH:mm", now);
      const status = isAfter(now, officialTime) ? "Late" : "Present";
      const lateMinutes = isAfter(now, officialTime) ? differenceInMinutes(now, officialTime) : 0;
      const attendance = new Attendance({ 
        userName, 
        date: dateStr, 
        checkIn: now, 
        status, 
        lateMinutes 
      });
      await attendance.save();
      return res.json({ status: "checked-in", attendance });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

api.post("/attendance/checkout", async (req, res) => {
  const { userName } = req.body;
  const now = new Date();
  const dateStr = format(now, "yyyy-MM-dd");
  try {
    const existing = await Attendance.findOne({ userName, date: dateStr });
    if (existing && !existing.checkOut) {
      existing.checkOut = now;
      const diff = differenceInMinutes(now, existing.checkIn);
      existing.workHours = Number((diff / 60).toFixed(2));
      existing.status = "Present";
      await existing.save();
      return res.json({ status: "checked-out", attendance: existing });
    } else if (existing && existing.checkOut) {
      return res.json({ status: "already-checked-out", attendance: existing });
    } else {
      return res.status(404).json({ error: "No check-in record found for today" });
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

// CSV Export
api.get("/admin/export/csv", async (req, res) => {
  const { month } = req.query;
  try {
    const targetDate = month ? parse(String(month), "yyyy-MM", new Date()) : new Date();
    const records = await Attendance.find({
      checkIn: { $gte: startOfMonth(targetDate), $lte: endOfMonth(targetDate) }
    }).sort({ checkIn: -1 });

    const headers = ["Employee", "Date", "Check In", "Check Out", "Status", "Work Hours", "Late Minutes"];
    const rows = records.map(r => [
      r.userName,
      r.date,
      r.checkIn ? format(new Date(r.checkIn), "hh:mm a") : "",
      r.checkOut ? format(new Date(r.checkOut), "hh:mm a") : "",
      r.status,
      r.workHours?.toString() || "0",
      r.lateMinutes?.toString() || "0",
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=attendance_${format(targetDate, "yyyy-MM")}.csv`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.Routing: Handle both /api/path and /path
app.use("/api", api);
app.use("/", api);

// 4. Automatic Checkout Job - Runs daily at 10:00 PM
function scheduleAutoCheckout() {
  const now = new Date();
  const targetTime = new Date();
  targetTime.setHours(22, 0, 0, 0); // 10:00:00 PM today
  
  // If it's already past 10 PM, schedule for tomorrow
  if (now > targetTime) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  
  const msUntilTarget = targetTime.getTime() - now.getTime();
  
  console.log(`⏰ Auto-checkout scheduled for ${format(targetTime, "PPpp")} (in ${Math.round(msUntilTarget / 1000 / 60)} minutes)`);
  
  setTimeout(() => {
    runAutoCheckout();
    // After first run, schedule daily
    setInterval(runAutoCheckout, 24 * 60 * 60 * 1000);
  }, msUntilTarget);
}

async function runAutoCheckout() {
  console.log(`[${format(new Date(), "PPpp")}] Running auto-checkout job...`);
  
  try {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const now = new Date();
    
    // Find all records from today that haven't checked out
    const unclosedRecords = await Attendance.find({
      date: todayStr,
      checkOut: { $exists: false }
    });
    
    if (unclosedRecords.length === 0) {
      console.log("✅ No pending checkouts found.");
      return;
    }
    
    console.log(`🔔 Found ${unclosedRecords.length} employee(s) who forgot to check out`);
    
    // Update each record
    for (const record of unclosedRecords) {
      record.checkOut = now;
      const diff = differenceInMinutes(now, record.checkIn);
      record.workHours = Number((diff / 60).toFixed(2));
      record.status = "Present"; // Keep as Present
      await record.save();
      console.log(`  ✓ Auto-checked out: ${record.userName} (${format(new Date(record.checkIn), "hh:mm a")} → ${format(now, "hh:mm a")})`);
    }
    
    console.log(`✅ Auto-checkout complete. Updated ${unclosedRecords.length} record(s).`);
  } catch (err: any) {
    console.error("❌ Auto-checkout error:", err.message);
  }
}

// Start the scheduler when server starts
connectToDatabase().then(() => {
  // Wait a moment for DB connection
  setTimeout(() => {
    scheduleAutoCheckout();
  }, 5000);
});

export default app;
