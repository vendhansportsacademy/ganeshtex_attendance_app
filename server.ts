import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { User, Attendance } from "./src/models.ts";
import { format, parse, differenceInMinutes, isAfter, startOfMonth, endOfMonth } from "date-fns";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI?.trim() || "mongodb+srv://ganeshtex:ganeshtex123@cluster0.0a3heot.mongodb.net/?appName=Cluster0";

// Standard connection logic (Avoid top-level await for better cold starts)
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// Demo data fallback logic
let demoEmployees = [
  { _id: "1", name: "Arun Kumar", department: "Engineering", empId: "EMP-2847", role: "employee" },
  { _id: "2", name: "Meena Siva", department: "HR & Admin", empId: "EMP-1093", role: "employee" }
];
let demoAttendance: any[] = [];
const isDemo = !process.env.MONGODB_URI;

// --- API ROUTES ---

app.get("/api/status", (req, res) => {
  res.json({ status: "online", dbState: mongoose.connection.readyState });
});

app.get("/api/employees", async (req, res) => {
  try {
    if (isDemo) return res.json(demoEmployees);
    const employees = await User.find({ role: "employee" }).sort({ name: 1 });
    res.json(employees);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ... Keep your other /api routes (post, put, delete, etc.) here ...
// Ensure all your backend routes start with /api/

app.post("/api/attendance/toggle", async (req, res) => {
    // ... your existing logic ...
});

app.get("/api/admin/reports/monthly", async (req, res) => {
    // ... your existing logic ...
});

// Export for Vercel
export default app;