import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true, unique: true },
  role: { type: String, enum: ["employee", "admin"], default: "employee" },
  department: { type: String, default: "General" },
  empId: { type: String, unique: true, sparse: true },
  joiningDate: { type: Date, default: Date.now },
  shiftStart: { type: String, default: "09:00" },
  shiftEnd: { type: String, default: "17:00" },
});

export const User = mongoose.model("User", UserSchema);

const AttendanceSchema = new Schema({
  userName: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  
  // Multiple sessions array - each session tracks a check-in/check-out pair
  sessions: {
    type: [{
      checkIn: { type: Date, required: true },
      checkOut: { type: Date },
      duration: { type: Number, default: 0 }, // hours
    }],
    default: []
  },
  
  // Computed daily summary fields
  firstCheckIn: { type: Date },
  lastCheckOut: { type: Date },
  totalHours: { type: Number, default: 0 },
  sessionCount: { type: Number, default: 0 },
  
  status: { type: String, enum: ["Present", "Late", "Half Day", "Absent", "Short Shift"], default: "Present" },
  lateMinutes: { type: Number, default: 0 },
  
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  deviceId: { type: String },
});

// Export the Attendance model
export const Attendance = mongoose.model("Attendance", AttendanceSchema);
