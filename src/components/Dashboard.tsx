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
        api.get("/attendance/today")
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
        setAttendance(attendance.map(a => a.userName === employee.name ? res.attendance : a));
      } else {
        setAttendance(attendance.filter(a => a.userName !== employee.name));
      }
    } catch (err: any) {
      setError(err.message || "Failed to update attendance");
    }
  };

  const getAttendanceRecord = (name: string) => attendance.find(a => a.userName === name);
  const isMarked = (name: string) => attendance.some(a => a.userName === name);
  const isCheckedOut = (name: string) => attendance.some(a => a.userName === name && a.checkOut);
  const markedCount = attendance.length;
  const totalCount = employees.length;
  const progressPercent = totalCount > 0 ? (markedCount / totalCount) * 100 : 0;

  return (
    <div className="p-6 md:p-12 max-w-2xl mx-auto">
      <div className="bg-[#111827] rounded-[2.5rem] border border-white/5 shadow-2xl p-8 md:p-10 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 mb-1">Attendance Register</p>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {format(currentTime, "EEEE, dd MMMM yyyy")}
            </h2>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center min-w-[80px] shadow-lg">
            <p className="text-2xl font-black font-mono text-brand leading-none mb-1">
              {format(currentTime, "h:mm")}
            </p>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{format(currentTime, "a")}</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-10 flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 flex-shrink-0">
            <Info size={16} />
          </div>
          <p className="text-sm text-white/60 leading-relaxed pt-1">
            Check the box next to your name to mark attendance. Time is captured automatically.
          </p>
        </div>

        {/* Section Title */}
        <div className="flex items-center gap-3 mb-6">
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40">Employees — Tap to mark</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-sm">
            <AlertCircle size={16} />
            {error}
            <button onClick={loadData} className="ml-auto underline font-bold">Retry</button>
          </div>
        )}

        {/* Employee List */}
        <div className="space-y-4 mb-10">
          <AnimatePresence mode="popLayout">
            {employees.length === 0 && !loading && (
              <div className="text-center py-10 text-white/20">
                <User size={48} className="mx-auto mb-4 opacity-10" />
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
                  "flex items-center gap-5 p-6 rounded-[2rem] border transition-all cursor-pointer group",
                  isMarked(emp.name)
                    ? "bg-white/[0.03] border-white/10"
                    : "bg-white/5 border-white/5 hover:border-white/10"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold uppercase transition-transform group-hover:scale-105",
                  getAvatarColor(index)
                )}>
                  {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <h4 className="font-bold text-xl text-white leading-tight mb-1">{emp.name}</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white/30 font-medium">
                      {emp.department}
                    </p>
                    {isMarked(emp.name) && (
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md",
                        isCheckedOut(emp.name) ? "bg-white/10 text-white/40" : "bg-emerald-500/10 text-emerald-400"
                      )}>
                        {isCheckedOut(emp.name) ? "Logged Out" : "Present"}
                      </span>
                    )}
                  </div>
                  {isMarked(emp.name) && (
                    <div className="flex gap-4 mt-2 font-mono text-[10px]">
                       <div className="text-white/40">IN: <span className="text-white/60">{format(new Date(getAttendanceRecord(emp.name)?.checkIn), "hh:mm a")}</span></div>
                       {isCheckedOut(emp.name) && (
                         <div className="text-white/40">OUT: <span className="text-white/60">{format(new Date(getAttendanceRecord(emp.name)?.checkOut), "hh:mm a")}</span></div>
                       )}
                    </div>
                  )}
                </div>

                {/* Checkbox */}
                <div className={cn(
                  "w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all",
                  isMarked(emp.name)
                    ? isCheckedOut(emp.name) 
                        ? "bg-white/10 border-white/20 text-white/40 opacity-60"
                        : "bg-brand/20 border-brand text-brand scale-110 shadow-lg shadow-brand/20"
                    : "border-white/10 group-hover:border-white/20 shadow-inner"
                )}>
                  {isMarked(emp.name) && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      {isCheckedOut(emp.name) ? <Clock size={20} /> : <CheckCircle2 size={24} />}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer Progress */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-white/60">
                <User size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Marked present</span>
             </div>
             <p className="text-emerald-400 font-black font-mono tracking-tighter text-lg">
               {markedCount}/{totalCount}
             </p>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getAvatarColor(index: number) {
  const colors = [
    "bg-indigo-500 text-indigo-50",
    "bg-emerald-500 text-emerald-50",
    "bg-orange-500 text-orange-50",
    "bg-rose-500 text-rose-50",
    "bg-sky-500 text-sky-50",
    "bg-amber-500 text-amber-50",
  ];
  return colors[index % colors.length];
}
