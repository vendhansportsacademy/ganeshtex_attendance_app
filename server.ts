import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { register } from "@vercel/express";
import { User, Attendance } from "./src/models.ts";
import { format, parse, differenceInMinutes, isAfter, startOfMonth, endOfMonth } from "date-fns";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createApp() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || "0.0.0.0";

  app.use(cors());
  app.use(express.json());

  // MongoDB Connection - Using user-provided URI or default fallback
  const MONGODB_URI = process.env.MONGODB_URI?.trim() || "mongodb+srv://ganeshtex:ganeshtex123@cluster0.0a3heot.mongodb.net/?appName=Cluster0";
  let isDemo = !MONGODB_URI || MONGODB_URI.includes("YOUR_MONGODB_URI");
  let dbConnectionError: string | null = null;

  mongoose.set("strictQuery", false);

  if (!isDemo) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log("✅ Connected to MongoDB");
      dbConnectionError = null;
      isDemo = false;
    } catch (err: any) {
      console.error("MongoDB connection failed:", err.message);
      dbConnectionError = err.message;
      isDemo = true;
    }
  } else {
    console.warn("⚠️ Running in demo mode because no valid MongoDB URI is configured.");
  }

  // Middleware to check DB connection
  const checkConnection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!isDemo && mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
      return res.status(503).json({ error: "Database connection lost. Please refresh or check your configuration." });
    }
    next();
  };

  // In-memory storage for Demo Mode
  let demoEmployees = [
    { _id: "1", name: "Arun Kumar", department: "Engineering", empId: "EMP-2847", role: "employee" },
    { _id: "2", name: "Meena Siva", department: "HR & Admin", empId: "EMP-1093", role: "employee" },
    { _id: "3", name: "Ravi Kumar", department: "Sales", empId: "EMP-3312", role: "employee" },
    { _id: "4", name: "Jegan Pandi", department: "Operations", empId: "EMP-4401", role: "employee" },
    { _id: "5", name: "Priya Lakshmi", department: "Engineering", empId: "EMP-2205", role: "employee" },
  ];
  let demoAttendance: any[] = [];

  // Health Check / DB Status
  app.get("/api/status", (req, res) => {
    res.json({
      isDemo,
      dbStatus: isDemo ? (dbConnectionError ? `Error: ${dbConnectionError}` : "Demo Mode") : "Connected (MongoDB)",
      readyState: mongoose.connection.readyState,
      connectionError: dbConnectionError,
      timestamp: new Date()
    });
  });

  // Employee Management
  app.get("/api/employees", checkConnection, async (req, res) => {
    try {
      if (isDemo) {
        return res.json(demoEmployees);
      }
      const employees = await User.find({ role: "employee" }).sort({ name: 1 });
      res.json(employees);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/employees", checkConnection, async (req, res) => {
    const { name, department, empId } = req.body;
    try {
      if (isDemo) {
        const newEmp = { name, department, empId, _id: Math.random().toString(), role: "employee" };
        demoEmployees.push(newEmp);
        return res.json(newEmp);
      }
      const employee = new User({ name, department, empId, role: "employee" });
      await employee.save();
      res.json(employee);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/employees/:id", checkConnection, async (req, res) => {
    try {
      if (isDemo) {
        const index = demoEmployees.findIndex(e => e._id === req.params.id);
        if (index !== -1) {
          demoEmployees[index] = { ...demoEmployees[index], ...req.body };
          return res.json(demoEmployees[index]);
        }
        return res.status(404).json({ error: "Employee not found" });
      }
      const employee = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(employee);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/employees/:id", checkConnection, async (req, res) => {
    try {
      if (isDemo) {
        demoEmployees = demoEmployees.filter(e => e._id !== req.params.id);
        return res.json({ success: true });
      }
      await User.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/attendance/toggle", checkConnection, async (req, res) => {
    const { userName } = req.body;
    const now = new Date();
    const dateStr = format(now, "yyyy-MM-dd");

    try {
      if (isDemo) {
        const existingIdx = demoAttendance.findIndex(a => a.userName === userName && a.date === dateStr);
        if (existingIdx !== -1) {
          const entry = demoAttendance[existingIdx];
          if (!entry.checkOut) {
            entry.checkOut = now;
            return res.json({ status: "checked-out", attendance: entry });
          } else {
            demoAttendance.splice(existingIdx, 1);
            return res.json({ status: "absent" });
          }
        } else {
          const newAtt = { userName, date: dateStr, checkIn: now, status: "Present" };
          demoAttendance.push(newAtt);
          return res.json({ status: "present", attendance: newAtt });
        }
      }

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
        let status: "Present" | "Late" = "Present";
        let lateMinutes = 0;

        if (isAfter(now, officialTime)) {
          status = "Late";
          lateMinutes = differenceInMinutes(now, officialTime);
        }

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

  app.get("/api/admin/reports/monthly", checkConnection, async (req, res) => {
    const { month } = req.query;
    try {
      if (isDemo) {
        return res.json(demoAttendance);
      }
      const targetDate = month ? parse(String(month), "yyyy-MM", new Date()) : new Date();
      const start = startOfMonth(targetDate);
      const end = endOfMonth(targetDate);

      const records = await Attendance.find({
        checkIn: { $gte: start, $lte: end }
      }).sort({ checkIn: -1 });

      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/attendance/today", checkConnection, async (req, res) => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    try {
      if (isDemo) {
        return res.json(demoAttendance.filter(a => a.date === dateStr));
      }
      const records = await Attendance.find({ date: dateStr });
      res.json(records);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      mode: !isDemo ? "production" : "demo",
      dbConnected: mongoose.connection.readyState === 1
    });
  });

  app.get("/api/admin/attendance", checkConnection, async (req, res) => {
    const { date } = req.query;
    try {
      if (isDemo) {
        if (date) {
          return res.json(demoAttendance.filter(a => a.date === date));
        }
        return res.json(demoAttendance);
      }

      const query = date ? { date: String(date) } : {};
      const records = await Attendance.find(query).sort({ checkIn: -1 }).limit(200);
      res.json(records);
    } catch (err: any) {
      console.error("Admin Attendance Error:", err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  });

  // 404 for API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Only serve static files locally (production mode without Vercel)
  if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else if (process.env.NODE_ENV !== "production") {
    // Dev mode: Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  return app;
}

// Create the Express app
const app = await createApp();

// Local development: start server if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || "0.0.0.0";

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Vercel serverless export using @vercel/express adapter
export default register(app, { registerFirst: true });
export { app, createApp };
