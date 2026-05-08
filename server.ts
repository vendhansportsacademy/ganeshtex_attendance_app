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
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    // Delete employee and all their attendance records
    await User.findByIdAndDelete(req.params.id);
    await Attendance.deleteMany({ userName: employee.name });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- ATTENDANCE ---
api.get("/attendance/today", async (req, res) => {
  const dateStr = format(new Date(), "yyyy-MM-dd");
  try {
    const employeeNames = (await User.find({ role: "employee" }).select("name")).map(e => e.name);
    const records = await Attendance.find({ date: dateStr, userName: { $in: employeeNames } });
    res.json(records);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

  // Helper function to compute daily summary from sessions
  function computeDailySummary(sessions: any[], shiftStart: string = "09:00") {
    if (sessions.length === 0) {
      return { firstCheckIn: undefined, lastCheckOut: undefined, totalHours: 0, sessionCount: 0, status: "Absent" as const, lateMinutes: 0 };
    }
    
    const firstCheckIn = sessions[0].checkIn;
    const lastSession = sessions[sessions.length - 1];
    const lastCheckOut = lastSession.checkOut;
    const totalHours = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const sessionCount = sessions.length;
    
    // Determine status based on first check-in vs shift start
    const now = new Date();
    const shiftDate = firstCheckIn ? new Date(firstCheckIn) : now;
    const officialTime = new Date(shiftDate);
    const [hours, minutes] = shiftStart.split(":").map(Number);
    officialTime.setHours(hours, minutes, 0, 0);
    
    let status: "Present" | "Late" | "Half Day" | "Absent" | "Short Shift" = "Present";
    let lateMinutes = 0;
    
    if (firstCheckIn && isAfter(firstCheckIn, officialTime)) {
      status = "Late";
      lateMinutes = differenceInMinutes(firstCheckIn, officialTime);
    } else if (totalHours < 4) {
      status = "Half Day";
    } else if (totalHours < 6) {
      status = "Short Shift";
    }
    
    return { firstCheckIn, lastCheckOut, totalHours, sessionCount, status, lateMinutes };
  }

api.post("/attendance/checkin", async (req, res) => {
  const { userName } = req.body;
  const now = new Date();
  const dateStr = format(now, "yyyy-MM-dd");
  try {
    const employee = await User.findOne({ name: userName, role: "employee" });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    const shiftStart = employee.shiftStart || "09:00";
    
    // Find or create today's attendance record
    let attendance = await Attendance.findOne({ userName, date: dateStr });
    
    if (!attendance) {
      // Create new daily record with first session
      attendance = new Attendance({
        userName,
        date: dateStr,
        sessions: [{ checkIn: now, checkOut: undefined, duration: 0 }],
      });
    } else {
      // Auto-close any currently open session before starting a new one
      const sessions = attendance.sessions;
      for (let i = sessions.length - 1; i >= 0; i--) {
        if (!sessions[i].checkOut) {
          sessions[i].checkOut = now;
          const diff = differenceInMinutes(now, sessions[i].checkIn);
          sessions[i].duration = Number((diff / 60).toFixed(2));
          break; // Close only the most recent open session
        }
      }
      // Start a new session
      attendance.sessions.push({ checkIn: now, checkOut: undefined, duration: 0 });
    }
    
    // Recompute daily summary from all sessions
    const summary = computeDailySummary(attendance.sessions, shiftStart);
    attendance.firstCheckIn = summary.firstCheckIn;
    attendance.lastCheckOut = summary.lastCheckOut;
    attendance.totalHours = summary.totalHours;
    attendance.sessionCount = summary.sessionCount;
    attendance.status = summary.status;
    attendance.lateMinutes = summary.lateMinutes;
    
    await attendance.save();
    return res.json({ status: "checked-in", attendance });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

api.post("/attendance/checkout", async (req, res) => {
  const { userName } = req.body;
  const now = new Date();
  const dateStr = format(now, "yyyy-MM-dd");
  try {
    const employee = await User.findOne({ name: userName, role: "employee" });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    const shiftStart = employee.shiftStart || "09:00";
    
    const attendance = await Attendance.findOne({ userName, date: dateStr });
    if (!attendance) {
      return res.status(404).json({ error: "No check-in record found for today" });
    }
    
    // Find the latest open session (no checkOut)
    const sessions = attendance.sessions;
    const openSessionIndex = sessions.findIndex(s => !s.checkOut);
    
    if (openSessionIndex === -1) {
      // All sessions are closed
      return res.json({ status: "already-checked-out", attendance });
    }
    
    // Close the open session
    const session = sessions[openSessionIndex];
    session.checkOut = now;
    const diffMinutes = differenceInMinutes(now, session.checkIn);
    session.duration = Number((diffMinutes / 60).toFixed(2));
    
    // Recompute daily summary
    const summary = computeDailySummary(attendance.sessions, shiftStart);
    attendance.firstCheckIn = summary.firstCheckIn;
    attendance.lastCheckOut = summary.lastCheckOut;
    attendance.totalHours = summary.totalHours;
    attendance.sessionCount = summary.sessionCount;
    attendance.status = summary.status;
    attendance.lateMinutes = summary.lateMinutes;
    
    await attendance.save();
    return res.json({ status: "checked-out", attendance });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- ADMIN REPORTS ---
api.get("/admin/attendance", async (req, res) => {
  const { date } = req.query;
  try {
    const employeeNames = (await User.find({ role: "employee" }).select("name")).map(e => e.name);
    const query: any = { userName: { $in: employeeNames } };
    if (date) query.date = date;
    const records = await Attendance.find(query).sort({ checkIn: -1 }).limit(100);
    res.json(records);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

api.get("/admin/reports/monthly", async (req, res) => {
  const { month } = req.query;
  try {
    const employeeNames = (await User.find({ role: "employee" }).select("name")).map(e => e.name);
    const targetDate = month ? parse(String(month), "yyyy-MM", new Date()) : new Date();
    const records = await Attendance.find({
      userName: { $in: employeeNames },
      checkIn: { $gte: startOfMonth(targetDate), $lte: endOfMonth(targetDate) }
    }).sort({ checkIn: -1 });
    res.json(records);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// CSV Export
api.get("/admin/export/csv", async (req, res) => {
  const { month } = req.query;
  try {
    const employeeNames = (await User.find({ role: "employee" }).select("name")).map(e => e.name);
    const targetDate = month ? parse(String(month), "yyyy-MM", new Date()) : new Date();
    const records = await Attendance.find({
      userName: { $in: employeeNames },
      checkIn: { $gte: startOfMonth(targetDate), $lte: endOfMonth(targetDate) }
    }).sort({ checkIn: -1 });

    const headers = ["Employee", "Date", "First Check In", "Last Check Out", "Total Hours", "Sessions", "Status"];
    const rows = records.map(r => [
      r.userName,
      r.date,
      r.firstCheckIn ? format(new Date(r.firstCheckIn), "hh:mm a") : "--",
      r.lastCheckOut ? format(new Date(r.lastCheckOut), "hh:mm a") : "--",
      (r.totalHours || 0).toFixed(2),
      r.sessionCount?.toString() || "0",
      r.status,
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
    
    const employeeNames = (await User.find({ role: "employee" }).select("name")).map(e => e.name);
    
    // Find all attendance records with at least one open session
    const records = await Attendance.find({
      date: todayStr,
      userName: { $in: employeeNames }
    });
    
    let updatedCount = 0;
    
    for (const record of records) {
      const openSession = record.sessions.find(s => !s.checkOut);
      if (openSession) {
        openSession.checkOut = now;
        const diffMinutes = differenceInMinutes(now, openSession.checkIn);
        openSession.duration = Number((diffMinutes / 60).toFixed(2));
        
        // Recompute summary
        const employee = await User.findOne({ name: record.userName, role: "employee" });
        const shiftStart = employee?.shiftStart || "09:00";
        const summary = computeDailySummary(record.sessions, shiftStart);
        record.firstCheckIn = summary.firstCheckIn;
        record.lastCheckOut = summary.lastCheckOut;
        record.totalHours = summary.totalHours;
        record.sessionCount = summary.sessionCount;
        record.status = summary.status;
        record.lateMinutes = summary.lateMinutes;
        
        await record.save();
        updatedCount++;
        console.log(`  ✓ Auto-checked out: ${record.userName} (session: ${format(new Date(openSession.checkIn), "hh:mm a")} → ${format(now, "hh:mm a")})`);
      }
    }
    
    if (updatedCount === 0) {
      console.log("✅ No pending checkouts found.");
    } else {
      console.log(`✅ Auto-checkout complete. Updated ${updatedCount} record(s).`);
    }
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