import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, UserPlus, Search, Filter, CheckCircle2, Clock, AlertCircle,
  Trash2, Edit2, X, Calendar, Download, LayoutDashboard, FileText,
  CheckSquare, Square, Activity, TrendingUp, Building2, UserCheck, BarChart4,
  User, Hash, Briefcase
} from "lucide-react";
import { api } from "../lib/api";
import { format, parse } from "date-fns";
import { cn } from "../lib/utils";
import { useToast } from "./Toast";

export default function AdminPanel() {
  const [activeView, setActiveView] = useState<"overview" | "attendance" | "employees" | "reports">("overview");
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal & Bulk states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{id: string, name: string} | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    empId: "",
    shiftStart: "",
    shiftEnd: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    if (activeView === "reports" || activeView === "overview") {
      loadReports();
    }
  }, [activeView, selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empData, attData] = await Promise.all([
        api.get("/employees"),
        api.get(`/admin/attendance?date=${selectedDate}`),
      ]);
      setEmployees(empData);
      setAttendance(attData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const data = await api.get(`/admin/reports/monthly?month=${selectedMonth}`);
      setReports(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", department: "", empId: "", shiftStart: "", shiftEnd: "" });
  };

  const InputField = ({
    label,
    icon,
    value,
    placeholder,
    onChange,
  }: {
    label: string;
    icon: React.ReactNode;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
  }) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
      onChange(localValue);
    };

    return (
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
            {icon}
          </div>
          <input
            type="text"
            value={localValue}
            placeholder={placeholder}
            onChange={e => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
          />
        </div>
      </div>
    );
  };

  const TimeCard = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const parts = localValue.split(":") || ["00", "00"];
    const hours = parts[0] || "00";
    const minutes = parts[1] || "00";

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const h = e.target.value.slice(0, 2);
      setLocalValue(`${h}:${minutes}`);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const m = e.target.value.slice(0, 2);
      setLocalValue(`${hours}:${m}`);
    };

    const handleBlur = () => {
      const h = Math.min(Math.max(parseInt(hours) || 0, 0), 23);
      const m = Math.min(Math.max(parseInt(minutes) || 0, 0), 59);
      const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      setLocalValue(formatted);
      onChange(formatted);
    };

    return (
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
        <div className="flex gap-2 items-center rounded-2xl border border-slate-200 bg-white p-3">
          <input
            type="text"
            inputMode="numeric"
            value={hours}
            onChange={handleHourChange}
            onBlur={handleBlur}
            maxLength={2}
            className="w-14 text-center text-2xl font-bold text-slate-900 bg-transparent focus:outline-none"
            placeholder="00"
          />
          <span className="text-2xl font-bold text-slate-300">:</span>
          <input
            type="text"
            inputMode="numeric"
            value={minutes}
            onChange={handleMinuteChange}
            onBlur={handleBlur}
            maxLength={2}
            className="w-14 text-center text-2xl font-bold text-slate-900 bg-transparent focus:outline-none"
            placeholder="00"
          />
        </div>
      </div>
    );
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setSubmitting(true);
    try {
      const dataToSave = {
        ...formData,
      };
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee._id}`, dataToSave);
        showToast("Employee updated successfully", "success");
      } else {
        await api.post("/employees", dataToSave);
        showToast("Employee added successfully", "success");
      }
      setIsModalOpen(false);
      setEditingEmployee(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Operation failed");
      showToast(err.message || "Operation failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (emp: any) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      department: emp.department,
      empId: emp.empId,
      shiftStart: emp.shiftStart || "",
      shiftEnd: emp.shiftEnd || ""
    });
    setIsModalOpen(true);
  };

  const handleDeleteEmployee = async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setLoading(true);
    setConfirmDelete(null);
    try {
      await api.delete(`/employees/${id}`);
      showToast(`"${name}" removed from directory`, "success");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete employee");
      showToast(err.message || "Failed to delete", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.size === 0) return;
    if (!confirm(`Delete ${selectedEmployees.size} employee(s)?`)) return;

    setLoading(true);
    try {
      await Promise.all(
        Array.from(selectedEmployees).map(id => api.delete(`/employees/${id}`))
      );
      showToast(`Deleted ${selectedEmployees.size} employee(s)`, "success");
      setSelectedEmployees(new Set());
      await loadData();
    } catch (err: any) {
      showToast("Bulk delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const csvText = await api.get(`/admin/export/csv?month=${selectedMonth}`, undefined, { responseType: "text" });
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${selectedMonth}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("Report downloaded successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to export report", "error");
    }
  };

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.department.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.empId?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

   // Compute stats
   const todayPresent = attendance.filter(a => a.date === format(new Date(), "yyyy-MM-dd") && a.sessions?.length > 0).length;
   const departments = Array.from(new Set(employees.map(e => e.department)));
   const monthlyRecords = reports.length;
   const totalWorkHours = reports.reduce((sum, r: any) => sum + (r.totalHours || 0), 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <BarChart4 className="text-brand" size={28} />
            Admin Console
          </h2>
          <div className="flex flex-wrap gap-4 mt-2">
            {[
              { key: "overview", label: "Overview", icon: LayoutDashboard },
              { key: "attendance", label: "Daily Logs", icon: Clock },
              { key: "employees", label: "Employees", icon: Users },
              { key: "reports", label: "Reports", icon: FileText },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key as any)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium pb-1 border-b-2 transition-all",
                  activeView === key
                    ? "text-brand border-brand"
                    : "text-slate-400 border-transparent hover:text-slate-600"
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          {(activeView === "attendance" || activeView === "employees" || activeView === "reports") && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all w-48 md:w-64"
              />
            </div>
          )}

          {/* Date/ Month Pickers */}
          {activeView === "attendance" && (
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all [color-scheme:light]"
              />
            </div>
          )}

          {activeView === "reports" && (
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all [color-scheme:light]"
              />
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all shadow-md"
                title="Export to CSV"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          )}

          {/* Add Employee Button */}
              <button
                onClick={() => {
                  setEditingEmployee(null);
                  setFormData({ name: "", department: "", empId: "", shiftStart: "", shiftEnd: "" });
                  setIsModalOpen(true);
                }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
          >
            <UserPlus size={18} />
            <span>Add Employee</span>
          </button>
        </div>
      </header>

      {/* Notifications */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-emerald-700"
        >
          <CheckCircle2 size={20} />
          <p className="text-sm font-medium">{success}</p>
        </motion.div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={loadData} className="text-xs font-bold uppercase tracking-wider bg-red-100 px-3 py-1 rounded-lg ml-auto">
            Retry
          </button>
        </div>
      )}

      {/* Overview View */}
      {activeView === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid with Icons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Employees"
              count={employees.length}
              icon={<Users size={24} />}
              color="blue"
              trend={`+${employees.length} active`}
            />
            <StatCard
              label="Present Today"
              count={todayPresent}
              icon={<UserCheck size={24} />}
              color="emerald"
              trend={`${employees.length > 0 ? Math.round((todayPresent / employees.length) * 100) : 0}% attendance`}
            />
            <StatCard
              label="Departments"
              count={departments.length}
              icon={<Building2 size={24} />}
              color="purple"
              trend={`${departments.join(", ")}`}
            />
            <StatCard
              label="Hours This Month"
              count={totalWorkHours.toFixed(1)}
              icon={<Clock size={24} />}
              color="amber"
              suffix="hrs"
            />
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-100">
                      <Activity className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-1">Activity Overview</h3>
                      <p className="text-slate-700">
                        {attendance.length} employees have marked attendance today.
                        {employees.length > attendance.length && ` ${employees.length - attendance.length} are absent.`}
                        {" "}Total: {attendance.reduce((sum, a) => sum + (a.sessionCount || 0), 0)} sessions, {attendance.reduce((sum, a) => sum + (a.totalHours || 0), 0).toFixed(1)} hours.
                      </p>
                    </div>
                  </div>
                </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-emerald-100">
                  <TrendingUp className="text-emerald-600" size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-1">Monthly Insight</h3>
                  <p className="text-slate-700">
                    {reports.length} total attendance records for {format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM")}.
                    {monthlyRecords > 0 ? ` Average: ${(totalWorkHours / monthlyRecords).toFixed(1)} hrs/day` : " No records yet."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-brand" />
              Department Breakdown
            </h3>
            {departments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {departments.map((dept, i) => {
                  const count = employees.filter(e => e.department === dept).length;
                  const percentage = Math.round((count / employees.length) * 100);
                  return (
                    <div
                      key={dept}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          i % 3 === 0 ? "bg-blue-100 text-blue-600" :
                          i % 3 === 1 ? "bg-purple-100 text-purple-600" :
                          "bg-amber-100 text-amber-600"
                        )}>
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{dept}</p>
                          <p className="text-xs text-slate-500">{count} employees</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-brand">{percentage}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Building2 size={48} className="mx-auto mb-2 opacity-50" />
                <p>No departments assigned yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance View */}
      {activeView === "attendance" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Clock className="text-brand" size={20} />
                Daily Attendance
              </h3>
              <span className="text-sm text-slate-500">{format(new Date(selectedDate), "MMMM dd, yyyy")}</span>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredEmployees.map((emp, i) => {
              const record = attendance.find(a => a.userName === emp.name);
              const isPresent = record && (record.sessions || []).length > 0;
              const sessions = record?.sessions || [];
              const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
              const isCheckedOut = lastSession?.checkOut;
              return (
                <div key={emp._id || i} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-brand uppercase">
                        {emp.name?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-700">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.department}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase",
                        isCheckedOut
                          ? "bg-slate-100 text-slate-500"
                          : isPresent
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-rose-100 text-rose-600"
                      )}
                    >
                      {isCheckedOut ? "Logged Out" : isPresent ? "Present" : "Absent"}
                    </span>
                  </div>
                  {isPresent && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-3 text-xs font-mono text-slate-600">
                        {sessions.map((session: any, idx: number) => (
                          <span key={idx}>
                            {format(new Date(session.checkIn), "hh:mm a")} - {session.checkOut ? format(new Date(session.checkOut), "hh:mm a") : "Open"}
                            {session.duration > 0 && ` (${session.duration.toFixed(1)}h)`}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-3 text-[10px] text-slate-400">
                        <span>{record.sessionCount || 0} session{(record.sessionCount || 0) !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{(record.totalHours || 0).toFixed(1)} hrs total</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Employee</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Department</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Sessions</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Total Hours</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, i) => {
                  const record = attendance.find(a => a.userName === emp.name);
                  const isPresent = record && (record.sessions || []).length > 0;
                  const sessions = record?.sessions || [];
                  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
                  const isCheckedOut = lastSession?.checkOut;
                  return (
                    <tr key={emp._id || i} className="group hover:bg-blue-50/30 border-b border-slate-100 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-brand uppercase">
                            {emp.name?.[0]}
                          </div>
                          <span className="font-bold text-sm text-slate-700">{emp.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-sm text-slate-600">{emp.department}</td>
                      <td className="p-4">
                        {isPresent ? (
                          <div className="flex flex-col gap-1">
                            {sessions.map((session: any, si: number) => (
                              <span key={si} className="font-mono text-xs text-slate-600">
                                {format(new Date(session.checkIn), "hh:mm a")} - {session.checkOut ? format(new Date(session.checkOut), "hh:mm a") : "Open"}
                                {session.duration > 0 && ` (${session.duration.toFixed(1)}h)`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">--</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-sm text-slate-600">
                        {isPresent ? `${(record.totalHours || 0).toFixed(1)} hrs` : "--"}
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase",
                            isCheckedOut
                              ? "bg-slate-100 text-slate-500"
                              : isPresent
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-rose-100 text-rose-600"
                          )}
                        >
                          {isCheckedOut ? "Logged Out" : isPresent ? "Present" : "Absent"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
               </tbody>
             </table>
           </div>
         </div>
       )}

      {/* Employees View */}
      {activeView === "employees" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Users className="text-brand" size={20} />
                Staff Directory
              </h3>
              <p className="text-sm text-slate-500">{employees.length} employees</p>
            </div>
            {selectedEmployees.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-all"
              >
                <Trash2 size={16} />
                Delete ({selectedEmployees.size})
              </button>
            )}
          </div>

          {/* Mobile View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredEmployees.map((emp, i) => (
              <div key={emp._id || i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.has(emp._id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedEmployees);
                      e.target.checked ? newSet.add(emp._id) : newSet.delete(emp._id);
                      setSelectedEmployees(newSet);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-brand uppercase shrink-0">
                    {emp.name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-700 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-500 truncate">{emp.department}</p>
                    <p className="text-xs font-mono text-brand">{emp.empId || "---"}</p>
                  </div>
                </div>
                <div className="flex gap-2 ml-2 shrink-0">
                  <button onClick={() => openEditModal(emp)} className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 hover:bg-blue-100">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => setConfirmDelete({ id: emp._id, name: emp.name })} className="p-2 bg-red-50 border border-red-100 rounded-lg text-red-600 hover:bg-red-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400 w-12">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployees(new Set(filteredEmployees.map(e => e._id)));
                        } else {
                          setSelectedEmployees(new Set());
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                    />
                  </th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Employee</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Department</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Employee ID</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, i) => (
                  <tr key={emp._id || i} className="group hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(emp._id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedEmployees);
                          e.target.checked ? newSet.add(emp._id) : newSet.delete(emp._id);
                          setSelectedEmployees(newSet);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-brand uppercase">
                          {emp.name?.[0]}
                        </div>
                        <span className="font-bold text-sm text-slate-700">{emp.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-sm text-slate-600">{emp.department}</td>
                    <td className="p-4 font-mono text-sm text-brand">{emp.empId || "---"}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(emp)} className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 hover:bg-blue-100">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setConfirmDelete({ id: emp._id, name: emp.name })} className="p-2 bg-red-50 border border-red-100 rounded-lg text-red-600 hover:bg-red-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports View */}
      {activeView === "reports" && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-gradient-to-r from-brand to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Monthly Report</h3>
                  <p className="text-white/80 mt-1">{format(parse(selectedMonth, "yyyy-MM", new Date()), "MMMM yyyy")}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-white/60 text-sm">Total Records</p>
                  <p className="text-3xl font-black">{reports.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">Employees</p>
                  <p className="text-3xl font-black">{employees.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-sm">Total Hours</p>
                  <p className="text-3xl font-black">{totalWorkHours.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="space-y-4">
            {employees
              .filter((emp) => emp.name.toLowerCase().includes(employeeSearch.toLowerCase()))
              .map((emp) => {
                const empRecords = reports.filter((r: any) => r.userName === emp.name);
                if (empRecords.length === 0) return null;

                return (
                  <div key={emp._id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-lg font-bold text-brand">
                            {emp.name[0]}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-slate-800">{emp.name}</h4>
                            <p className="text-sm text-slate-500">{emp.department} • {emp.empId}</p>
                          </div>
                        </div>
                        <div className="text-center sm:text-right">
                          <p className="text-2xl font-black text-brand">{empRecords.length}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Days Present</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50">
                          <tr className="border-b border-slate-100">
                            <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Date</th>
                            <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Sessions</th>
                            <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Total Hours</th>
                            <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Sessions</th>
                            <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empRecords.map((rec: any, ri: number) => (
                            <tr key={ri} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors">
                              <td className="p-4 font-mono text-sm text-slate-600">{rec.date}</td>
                              <td className="p-4">
                                <div className="flex flex-col gap-1">
                                  {rec.sessions?.map((session: any, si: number) => (
                                    <span key={si} className="font-mono text-xs text-slate-600">
                                      {format(new Date(session.checkIn), "hh:mm a")} - {session.checkOut ? format(new Date(session.checkOut), "hh:mm a") : "Open"}
                                      {session.duration > 0 && ` (${session.duration.toFixed(1)}h)`}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 font-mono text-sm text-slate-600">{rec.totalHours?.toFixed(1) || "0.0"} hrs</td>
                              <td className="p-4 font-mono text-sm text-slate-600">{rec.sessionCount}</td>
                              <td className="p-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter",
                                  (rec.status === "Present" || rec.status === "Checked In")
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-amber-100 text-amber-600"
                                )}>
                                  {rec.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            {employees.length > 0 && reports.length === 0 && (
              <div className="text-center py-20 text-slate-400">
                <Calendar className="mx-auto mb-4" size={48} />
                <p className="font-medium">No attendance records for this month</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Summary Cards Row */}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl p-4 sm:p-8 relative"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-xl">
                <X size={20} className="text-slate-400" />
              </button>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand/10 p-3 text-brand">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{editingEmployee ? "Edit employee" : "Add employee"}</h3>
                    <p className="text-sm text-slate-500">Create or update employee details with a responsive shift schedule.</p>
                  </div>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Mobile friendly</span>
              </div>
              <form onSubmit={handleSaveEmployee} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <InputField
                      label="Full name"
                      icon={<User size={18} />}
                      value={formData.name}
                      placeholder="e.g. Priya Ramesh"
                      onChange={value => setFormData({ ...formData, name: value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <InputField
                      label="Employee ID"
                      icon={<Hash size={18} />}
                      value={formData.empId}
                      placeholder="e.g. EMP-00142"
                      onChange={value => setFormData({ ...formData, empId: value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <InputField
                      label="Department"
                      icon={<Briefcase size={18} />}
                      value={formData.department}
                      placeholder="e.g. Engineering"
                      onChange={value => setFormData({ ...formData, department: value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TimeCard
                    label="Shift start"
                    value={formData.shiftStart}
                    onChange={value => setFormData({ ...formData, shiftStart: value })}
                  />
                  <TimeCard
                    label="Shift end"
                    value={formData.shiftEnd}
                    onChange={value => setFormData({ ...formData, shiftEnd: value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {submitting ? "Processing..." : editingEmployee ? "Update employee" : "Add employee"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Employee?</h3>
              <p className="text-slate-600 mb-6">
                This will permanently remove <span className="font-bold">{confirmDelete.name}</span>.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEmployee}
                  className="py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-md"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, count, icon, color, trend, suffix }: {
  label: string;
  count: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  suffix?: string;
}) {
  const colorClasses: Record<string, { bg: string; border: string; iconBg: string; iconText: string; text: string }> = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-100",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
      text: "text-blue-600"
    },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      text: "text-emerald-600"
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-100",
      iconBg: "bg-purple-100",
      iconText: "text-purple-600",
      text: "text-purple-600"
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-100",
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      text: "text-amber-600"
    },
    brand: {
      bg: "bg-brand/10",
      border: "border-brand/20",
      iconBg: "bg-brand/20",
      iconText: "text-brand",
      text: "text-brand"
    }
  };

  const colors = colorClasses[color] || colorClasses.brand;

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-2xl p-5 transition-all hover:shadow-lg hover:scale-[1.02]`}>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colors.iconBg} border ${colors.border}`}>
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-black font-mono text-slate-800">
          {count}{suffix && <span className="text-lg font-normal text-slate-500 ml-1">{suffix}</span>}
        </p>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
