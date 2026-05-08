import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock, CheckCircle2, AlertCircle, Search, X, History, Calendar,
  Building2, UserCheck, Users, Bell
} from "lucide-react";
import { api } from "../lib/api";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { useToast } from "./Toast";

export default function Dashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [employeeHistory, setEmployeeHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showLateList, setShowLateList] = useState(false);
  const { showToast } = useToast();

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

  const checkIn = async (employee: any) => {
    try {
      const res = await api.post("/attendance/checkin", { userName: employee.name });
      if (res.status === "checked-in") {
        setAttendance(prev => {
          const existing = prev.find(a => a.userName === employee.name);
          if (existing) {
            return prev.map(a => a.userName === employee.name ? res.attendance : a);
          }
          return [...prev, res.attendance];
        });
        showToast(`Checked in for ${employee.name}`, "success");
      }
    } catch (err: any) {
      setError(err.message || "Failed to check in");
      showToast(err.message || "Failed to check in", "error");
    }
  };

  const checkOut = async (employee: any) => {
    try {
      const res = await api.post("/attendance/checkout", { userName: employee.name });
      if (res.status === "checked-out") {
        setAttendance(prev => prev.map(a => a.userName === employee.name ? res.attendance : a));
        showToast(`Checked out successfully`, "success");
      } else if (res.status === "already-checked-out") {
        showToast(`${employee.name} is already checked out`, "info");
      }
    } catch (err: any) {
      setError(err.message || "Failed to check out");
      showToast(err.message || "Failed to check out", "error");
    }
  };

  const viewHistory = async (employee: any) => {
    setSelectedEmployee(employee);
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const data = await api.get(`/admin/reports/monthly?month=${format(new Date(), "yyyy-MM")}`);
      const filtered = data.filter((r: any) => r.userName === employee.name);
      setEmployeeHistory(filtered);
    } catch (err: any) {
      console.error(err);
      setEmployeeHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getAttendanceRecord = (name: string) => attendance.find((a) => a.userName === name);
  const isMarked = (name: string) => attendance.some((a) => a.userName === name);
  const isCheckedOut = (name: string) => attendance.some((a) => a.userName === name && a.checkOut);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const markedCount = attendance.length;
  const presentCount = attendance.filter(a => !a.checkOut).length;
  const totalCount = employees.length;
  const progressPercent = totalCount > 0 ? (markedCount / totalCount) * 100 : 0;
  const lateCount = attendance.filter(a => a.status === "Late").length;

  const stats = [
    { label: "Present", count: presentCount, color: "emerald", icon: CheckCircle2 },
    { label: "Checked Out", count: markedCount - presentCount, color: "blue", icon: Clock },
    { label: "Absent", count: totalCount - markedCount, color: "slate", icon: AlertCircle },
    { label: "Total", count: totalCount, color: "brand", icon: Users },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-12 max-w-5xl mx-auto">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 rounded-xl border border-brand/20">
            <Users className="text-brand" size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-500/60 mb-1">Attendance Register</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <Calendar size={24} className="text-brand" />
              {format(currentTime, "EEEE, dd MMMM yyyy")}
            </h2>
          </div>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
          />
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            emerald: "bg-emerald-50 border-emerald-100",
            blue: "bg-blue-50 border-blue-100",
            slate: "bg-slate-50 border-slate-100",
            brand: "bg-brand/10 border-brand/20",
          };
          const textColorClasses = {
            emerald: "text-emerald-600",
            blue: "text-blue-600",
            slate: "text-slate-600",
            brand: "text-brand",
          };
          return (
            <div
              key={stat.label}
              className={cn(
                "rounded-xl border p-4 flex items-center gap-3 transition-all hover:shadow-lg hover:scale-[1.02]",
                colorClasses[stat.color as keyof typeof colorClasses]
              )}
            >
              <div className={cn("p-2 rounded-lg bg-white/80", textColorClasses[stat.color as keyof typeof textColorClasses])}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-black font-mono text-slate-800">{stat.count}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        {/* Current Time & Progress */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
           <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                 <p className="text-3xl font-black font-mono text-slate-800 leading-none">
                   {format(currentTime, "hh:mm a")}
                 </p>
               </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Progress</p>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      className={cn(
                        "h-full rounded-full transition-all",
                        progressPercent >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-brand"
                      )}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-600">{Math.round(progressPercent)}%</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black font-mono text-brand">{markedCount}/{totalCount}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marked Present</p>
            </div>
          </div>
          {/* Mobile progress */}
          <div className="sm:hidden mb-2">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className={cn(
                  "h-full rounded-full transition-all",
                  progressPercent >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-brand"
                )}
              />
            </div>
            <p className="text-xs text-slate-500 text-right mt-1">{Math.round(progressPercent)}% complete</p>
          </div>
        </div>

{/* Info Box */}
          <div className="mx-4 sm:mx-6 mt-4 bg-blue-50/60 border border-blue-100 rounded-xl p-3 sm:p-4 flex gap-3 items-start">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 flex-shrink-0">
              <Bell size={14} />
            </div>
            <div className="flex-1">
              {lateCount > 0 ? (
                <>
                  <button
                    onClick={() => setShowLateList(!showLateList)}
                    className="flex items-center gap-1 text-xs sm:text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
                  >
                    <AlertCircle size={14} className="text-amber-600" />
                    {lateCount} employee{lateCount === 1 ? '' : 's'} late today!
                  </button>
                  <AnimatePresence>
                    {showLateList && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 pl-5 space-y-1 overflow-hidden"
                      >
                        {attendance
                          .filter(a => a.status === "Late")
                          .map(a => (
                            <p key={a.userName} className="text-xs text-slate-600">
                              • {a.userName} ({format(new Date(a.checkIn), "hh:mm a")})
                            </p>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-0.5 sm:pt-1">
                  Tap any employee to toggle attendance. Click the <History size={12} className="inline mx-1 text-brand" /> icon to view their monthly history.
                </p>
              )}
            </div>
          </div>

        {/* Employee List */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                  <div className="w-12 h-12 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto text-red-400 mb-3" size={48} />
              <p className="text-slate-600 mb-4">{error}</p>
              <button onClick={loadData} className="px-6 py-2.5 bg-brand text-white rounded-xl font-bold hover:bg-brand/90 transition-all">
                Retry
              </button>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Search className="mx-auto mb-3" size={40} />
              <p className="font-medium">No employees found</p>
              <p className="text-sm mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmployees.map((emp, index) => (
                <motion.div
                  key={emp._id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all group",
                    isMarked(emp.name)
                      ? "bg-emerald-50/50 border-emerald-100"
                      : "bg-white border-slate-200 hover:border-blue-200 hover:shadow-md"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-lg font-bold uppercase transition-transform group-hover:scale-105 shadow-sm",
                      getAvatarColor(index)
                    )}
                  >
                    {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base sm:text-lg text-slate-800 leading-tight mb-0.5 truncate">
                      {emp.name}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs sm:text-sm text-slate-500 font-medium">
                        <Building2 size={12} className="text-slate-400" />
                        {emp.department}
                      </span>
                      {isMarked(emp.name) && (
                        <span
                          className={cn(
                            "text-[9px] sm:text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md whitespace-nowrap inline-flex items-center gap-1",
                            isCheckedOut(emp.name)
                              ? "bg-slate-100 text-slate-500"
                              : "bg-emerald-100 text-emerald-600"
                          )}
                        >
                          {isCheckedOut(emp.name) ? <Clock size={8} /> : <CheckCircle2 size={8} />}
                          {isCheckedOut(emp.name) ? "Logged Out" : "Present"}
                        </span>
                      )}
                    </div>
                    {isMarked(emp.name) && (
                      <div className="flex gap-3 sm:gap-4 mt-1 sm:mt-2 font-mono text-[10px] sm:text-xs text-slate-500">
                        <div className="truncate">
                          IN: <span className="text-slate-700 font-medium">{format(new Date(getAttendanceRecord(emp.name)?.checkIn), "hh:mm aa")}</span>
                        </div>
                        {isCheckedOut(emp.name) && (
                          <div className="truncate">
                            OUT: <span className="text-slate-700 font-medium">{format(new Date(getAttendanceRecord(emp.name)?.checkOut), "hh:mm a")}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

{/* Actions */}
                   <div className="flex items-center gap-2">
                     <button
                       onClick={(e) => { e.stopPropagation(); viewHistory(emp); }}
                       className="p-2 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/10 transition-all"
                       title="View History"
                     >
                       <History size={18} />
                     </button>
                     {isCheckedOut(emp.name) ? (
                       <button
                         onClick={() => checkIn(emp)}
                         className="px-3 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-md"
                       >
                         Check In
                       </button>
                     ) : isMarked(emp.name) ? (
                       <button
                         onClick={() => checkOut(emp)}
                         className="px-3 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md"
                       >
                         Check Out
                       </button>
                     ) : (
                       <button
                         onClick={() => checkIn(emp)}
                         className="px-3 py-2 bg-brand text-white rounded-xl font-bold hover:bg-brand/90 transition-all shadow-md"
                       >
                         Check In
                       </button>
                     )}
                   </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-lg font-bold text-brand">
                    {selectedEmployee?.name?.[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <UserCheck size={20} className="text-brand" />
                      {selectedEmployee?.name}
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Building2 size={12} />
                      {selectedEmployee?.department} • {selectedEmployee?.empId || "No ID"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {loadingHistory ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse h-16 bg-slate-50 rounded-xl" />
                    ))}
                  </div>
                ) : employeeHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="mx-auto mb-3" size={40} />
                    <p>No attendance records this month</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employeeHistory.map((record: any) => (
                      <div
                        key={record._id}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <Calendar size={18} className="text-blue-500" />
                          </div>
                          <div>
                            <p className="font-mono text-sm font-medium text-slate-700">{record.date}</p>
                            <p className="text-xs text-slate-400">
                              {record.checkIn ? format(new Date(record.checkIn), "hh:mm a") : "--"} -{" "}
                              {record.checkOut ? format(new Date(record.checkOut), "hh:mm a") : "--"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={cn(
                              "px-3 py-1 rounded-lg text-[10px] font-black uppercase",
                              record.status === "Present" || record.status === "Checked In"
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-amber-100 text-amber-600"
                            )}
                          >
                            {record.status}
                          </span>
                          {record.workHours && (
                            <p className="text-xs text-slate-500 mt-1 font-mono">{record.workHours} hrs</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {employeeHistory.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-brand" />
                      <div>
                        <p className="text-slate-500">Total Days Present</p>
                        <p className="text-2xl font-black text-brand">{employeeHistory.length}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-emerald-600" />
                      <div>
                        <p className="text-slate-500">Avg Hours</p>
                        <p className="text-2xl font-black text-slate-700">
                          {employeeHistory.length > 0
                            ? (employeeHistory.reduce((sum: number, r: any) => sum + (r.workHours || 0), 0) / employeeHistory.length).toFixed(1)
                            : "0.0"}{" "}
                          hrs
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getAvatarColor(index: number) {
  const colors = [
    "bg-brand text-white",
    "bg-blue-500 text-white",
    "bg-indigo-500 text-white",
    "bg-sky-500 text-white",
    "bg-violet-500 text-white",
  ];
  return colors[index % colors.length];
}
