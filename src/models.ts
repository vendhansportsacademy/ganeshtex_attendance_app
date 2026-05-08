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
  checkIn: { type: Date, required: true },
  checkOut: { type: Date },
  status: { type: String, enum: ["Present", "Late", "Half Day", "Absent", "Short Shift"], default: "Present" },
  workHours: { type: Number, default: 0 },
  lateMinutes: { type: Number, default: 0 },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  deviceId: { type: String },
});

// Fix the 'a' to a capital 'A'
export const Attendance = mongoose.model("Attendance", AttendanceSchema);
