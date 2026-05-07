import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, CheckCircle2, User, AlertCircle, Info } from "lucide-react";
import { api } from "../lib/api";
import { format } from "date-fns";
import { cn } from "../lib/utils";

export default function Dashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadData();
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empData, attData] = await Promise.all([
        api.get("/employees"),
        api.get("/attendance/today"),
      ]);
      setEmployees(empData);
      setAttendance(attData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (employee: any) => {
    try {
      const res = await api.post("/attendance/toggle", { userName: employee.name });

      if (res.status === "present") {
        setAttendance([...attendance, res.attendance || { userName: employee.name }]);
      } else if (res.status === "checked-out") {
        setAttendance(attendance.map((a) => (a.userName === employee.name ? res.attendance : a)));
      } else {
        setAttendance(attendance.filter((a) => a.userName !== employee.name));
      }
    } catch (err: any) {
      setError(err.message || "Failed to update attendance");
    }
  };

  const getAttendanceRecord = (name: string) => attendance.find((a) => a.userName === name);
  const isMarked = (name: string) => attendance.some((a) => a.userName === name);
  const isCheckedOut = (name: string) => attendance.some((a) => a.userName === name && a.checkOut);
  const markedCount = attendance.length;
  const totalCount = employees.length;
  const progressPercent = totalCount > 0 ? (markedCount / totalCount) * 100 : 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-blue-100 shadow-xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-blue-100/30 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-blue-50/50 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-500/60 mb-1">Attendance Register</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-800">
              {format(currentTime, "EEEE, dd MMMM yyyy")}
            </h2>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-md min-w-[100px]">
            <p className="text-xl sm:text-2xl font-black font-mono text-brand leading-none mb-1">
              {format(currentTime, "h:mm")}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(currentTime, "a")}</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8 flex gap-3 items-start">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0">
            <Info size={14} />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-0.5 sm:pt-1">
            Tap your name to mark attendance. Time is captured automatically.
          </p>
        </div>

        {/* Section Title */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Employees — Tap to mark</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} />
            <span className="flex-1">{error}</span>
            <button onClick={loadData} className="underline font-bold whitespace-nowrap">Retry</button>
          </div>
        )}

        {/* Employee List */}
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          <AnimatePresence mode="popLayout">
            {employees.length === 0 && !loading && (
              <div className="text-center py-8 sm:py-12 text-slate-300">
                <User size={40} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No employees found</p>
              </div>
            )}

            {employees.map((emp, index) => (
              <motion.div
                key={emp._id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => toggleAttendance(emp)}
                className={cn(
                  "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer group",
                  isMarked(emp.name)
                    ? "bg-blue-50/50 border-blue-100"
                    : "bg-white border-slate-200 hover:border-blue-200 hover:shadow-md"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-lg font-bold uppercase transition-transform group-hover:scale-105",
                    getAvatarColor(index)
                  )}
                >
                  {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-base sm:text-lg text-slate-800 leading-tight mb-0.5 truncate">{emp.name}</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs sm:text-sm text-slate-500 font-medium truncate max-w-[120px] sm:max-w-none">
                      {emp.department}
                    </p>
                    {isMarked(emp.name) && (
                      <span
                        className={cn(
                          "text-[9px] sm:text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md whitespace-nowrap",
                          isCheckedOut(emp.name)
                            ? "bg-slate-100 text-slate-500"
                            : "bg-emerald-100 text-emerald-600"
                        )}
                      >
                        {isCheckedOut(emp.name) ? "Logged Out" : "Present"}
                      </span>
                    )}
                  </div>
                  {isMarked(emp.name) && (
                    <div className="flex gap-3 sm:gap-4 mt-1 sm:mt-2 font-mono text-[10px] sm:text-xs text-slate-500">
                      <div className="truncate">
                        IN: <span className="text-slate-700">{format(new Date(getAttendanceRecord(emp.name)?.checkIn), "hh:mm a")}</span>
                      </div>
                      {isCheckedOut(emp.name) && (
                        <div className="truncate">
                          OUT: <span className="text-slate-700">{format(new Date(getAttendanceRecord(emp.name)?.checkOut), "hh:mm a")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Checkbox */}
                <div
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0",
                    isMarked(emp.name)
                      ? isCheckedOut(emp.name)
                        ? "bg-slate-100 border-slate-200 text-slate-400"
                        : "bg-brand border-brand text-white scale-110 shadow-lg shadow-brand/20"
                      : "border-slate-300 group-hover:border-blue-300"
                  )}
                >
                  {isMarked(emp.name) && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      {isCheckedOut(emp.name) ? <Clock size={16} /> : <CheckCircle2 size={20} />}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer Progress */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 sm:p-6">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-slate-600">
              <User size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Marked present</span>
            </div>
            <p className="text-emerald-600 font-black font-mono tracking-tighter text-lg">
              {markedCount}/{totalCount}
            </p>
          </div>
          <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getAvatarColor(index: number) {
  const colors = [
    "bg-blue-500 text-white",
    "bg-blue-400 text-white",
    "bg-blue-600 text-white",
    "bg-indigo-500 text-white",
    "bg-sky-500 text-white",
  ];
  return colors[index % colors.length];
}
