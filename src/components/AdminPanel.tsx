import React, { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, UserPlus, Search, Filter, MoreHorizontal, CheckCircle2, Clock, AlertCircle, Trash2, Edit2, X, Calendar } from "lucide-react";
import { api } from "../lib/api";
import { format } from "date-fns";
import { cn } from "../lib/utils";

export default function AdminPanel() {
  const [activeView, setActiveView] = useState<"attendance" | "employees" | "reports">("attendance");
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<{ isDemo: boolean; dbStatus: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", department: "", empId: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    if (activeView === "reports") {
      loadReports();
    }
  }, [activeView, selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empData, attData, statusData] = await Promise.all([
        api.get("/employees"),
        api.get(`/admin/attendance?date=${selectedDate}`),
        api.get("/status").catch(() => ({ isDemo: true, dbStatus: "Offline" })),
      ]);
      setEmployees(empData);
      setAttendance(attData);
      setDbStatus(statusData);
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
      setError("Failed to load reports");
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setSubmitting(true);
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee._id}`, formData);
        setSuccess("Employee updated successfully");
      } else {
        await api.post("/employees", formData);
        setSuccess("Employee added successfully");
      }
      setIsModalOpen(false);
      setEditingEmployee(null);
      setFormData({ name: "", department: "", empId: "" });
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Operation failed. Name or ID might be duplicate.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!confirmDelete) return;
    const { id, name } = confirmDelete;
    setLoading(true);
    setConfirmDelete(null);
    try {
      await api.delete(`/employees/${id}`);
      setSuccess(`Employee "${name}" has been removed.`);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete employee");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (emp: any) => {
    setEditingEmployee(emp);
    setFormData({ name: emp.name, department: emp.department, empId: emp.empId });
    setActiveView("employees");
    setIsModalOpen(true);
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase()) ||
      e.empId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {dbStatus && (
        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              "px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2",
              dbStatus.isDemo
                ? dbStatus.dbStatus.includes("Error")
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-emerald-50 border-emerald-200 text-emerald-600"
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                dbStatus.isDemo
                  ? dbStatus.dbStatus.includes("Error")
                    ? "bg-red-500"
                    : "bg-amber-500 animate-pulse"
                  : "bg-emerald-500"
              )}
            />
            {dbStatus.dbStatus}
          </div>
          {dbStatus.isDemo && dbStatus.dbStatus.includes("Error") && (
            <div className="text-[10px] text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 max-w-sm text-right">
              <p className="font-bold mb-1">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your MongoDB connection string</li>
                <li>Verify IP whitelist in MongoDB Atlas</li>
                <li>Ensure credentials are correct</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-emerald-600"
        >
          <CheckCircle2 size={20} />
          <p className="text-sm font-medium">{success}</p>
        </motion.div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={loadData} className="text-xs font-bold uppercase tracking-wider bg-red-100 px-3 py-1 rounded-lg">
            Retry
          </button>
        </div>
      )}

      <header className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Admin Console</h2>
            <div className="flex gap-3 sm:gap-4 mt-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveView("attendance")}
                className={cn(
                  "text-sm font-medium pb-1 border-b-2 transition-all whitespace-nowrap",
                  activeView === "attendance" ? "text-brand border-brand" : "text-slate-400 border-transparent hover:text-slate-600"
                )}
              >
                Daily Logs
              </button>
              <button
                onClick={() => setActiveView("employees")}
                className={cn(
                  "text-sm font-medium pb-1 border-b-2 transition-all whitespace-nowrap",
                  activeView === "employees" ? "text-brand border-brand" : "text-slate-400 border-transparent hover:text-slate-600"
                )}
              >
                Employee List
              </button>
              <button
                onClick={() => setActiveView("reports")}
                className={cn(
                  "text-sm font-medium pb-1 border-b-2 transition-all whitespace-nowrap",
                  activeView === "reports" ? "text-brand border-brand" : "text-slate-400 border-transparent hover:text-slate-600"
                )}
              >
                Monthly Reports
              </button>
            </div>
          </div>
        </div>

        {/* Search and Add button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {(activeView === "attendance" || activeView === "reports") && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Employee..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-brand transition-all"
                />
              </div>
              {activeView === "attendance" && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand transition-all"
                />
              )}
            </div>
          )}
          <button
            onClick={() => {
              setEditingEmployee(null);
              setFormData({ name: "", department: "", empId: "" });
              setActiveView("employees");
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white rounded-xl hover:bg-brand-light transition-all text-sm font-bold shadow-lg shadow-brand/20"
          >
            <UserPlus size={18} />
            Add Employee
          </button>
        </div>
      </header>

      {/* Quick Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <AdminStat
          label="Total Employees"
          count={employees.length.toString()}
          icon={<Users className="text-brand" size={20} />}
        />
        <AdminStat
          label="Today Present"
          count={attendance.filter((a) => a.date === format(new Date(), "yyyy-MM-dd")).length.toString()}
          icon={<CheckCircle2 className="text-emerald-500" size={20} />}
        />
        <div onClick={() => setActiveView("reports")} className="cursor-pointer group">
          <AdminStat
            label="Monthly Reports"
            count={selectedMonth}
            icon={<Calendar className="text-blue-500 group-hover:scale-110 transition-transform" size={20} />}
          />
        </div>
        <AdminStat
          label="Departments"
          count={Array.from(new Set(employees.map((e) => e.department))).length.toString()}
          icon={<Filter size={18} className="text-slate-400" />}
        />
      </div>

      {activeView === "attendance" ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-800">Daily Attendance Stream</h3>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Employee</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Date</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Check In</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Check Out</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance
                  .filter((att) => att.userName.toLowerCase().includes(employeeSearch.toLowerCase()))
                  .map((att, i) => (
                    <tr key={att._id || i} className="group hover:bg-blue-50/50 border-b border-slate-100 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-brand uppercase">
                            {att.userName?.[0] || "?"}
                          </div>
                          <span className="font-medium text-sm text-slate-700">{att.userName}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">{att.date}</td>
                      <td className="p-4 font-mono text-sm tracking-tight text-slate-600">
                        {att.checkIn ? format(new Date(att.checkIn), "hh:mm a") : "--"}
                      </td>
                      <td className="p-4 font-mono text-sm tracking-tight text-slate-600">
                        {att.checkOut ? format(new Date(att.checkOut), "hh:mm a") : "--"}
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                            att.status === "Present" || att.status === "Checked In"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-amber-100 text-amber-600"
                          )}
                        >
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeView === "reports" ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="font-bold text-xl text-slate-800">Monthly Performance Logs</h3>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 outline-none focus:border-brand transition-all [color-scheme:light]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {employees
              .filter((emp) => emp.name.toLowerCase().includes(employeeSearch.toLowerCase()))
              .map((emp) => {
                const empRecords = reports.filter((r) => r.userName === emp.name);
                if (empRecords.length === 0) return null;

                return (
                  <div key={emp._id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 flex items-center justify-center text-lg font-bold text-brand">
                          {emp.name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-base sm:text-lg text-slate-800">{emp.name}</h4>
                          <p className="text-xs sm:text-sm text-slate-500 font-medium uppercase tracking-wider">
                            {emp.department} • {emp.empId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl sm:text-2xl font-black text-slate-800">{empRecords.length}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Days Present</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <table className="w-full text-left border-collapse min-w-[400px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-3 sm:p-4 text-[9px] uppercase tracking-widest font-black text-slate-400">Date</th>
                            <th className="p-3 sm:p-4 text-[9px] uppercase tracking-widest font-black text-slate-400">Check In</th>
                            <th className="p-3 sm:p-4 text-[9px] uppercase tracking-widest font-black text-slate-400">Check Out</th>
                            <th className="p-3 sm:p-4 text-[9px] uppercase tracking-widest font-black text-slate-400">Total Hours</th>
                            <th className="p-3 sm:p-4 text-[9px] uppercase tracking-widest font-black text-slate-400 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empRecords.map((rec: any, ri: number) => (
                            <tr key={ri} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors">
                              <td className="p-3 sm:p-4 font-mono text-[11px] text-slate-600">{rec.date}</td>
                              <td className="p-3 sm:p-4 font-mono text-sm text-brand">{rec.checkIn ? format(new Date(rec.checkIn), "hh:mm a") : "--"}</td>
                              <td className="p-3 sm:p-4 font-mono text-sm text-brand">{rec.checkOut ? format(new Date(rec.checkOut), "hh:mm a") : "--"}</td>
                              <td className="p-3 sm:p-4 font-mono text-sm text-slate-600">{rec.workHours ? `${rec.workHours} hrs` : "--"}</td>
                              <td className="p-3 sm:p-4 text-right">
                                <span
                                  className={cn(
                                    "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter",
                                    rec.status === "Present" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                                  )}
                                >
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
              <div className="py-12 sm:py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <Clock className="mx-auto text-slate-300 mb-4" size={40} />
                <p className="text-slate-500 font-medium italic">No attendance records found for this month.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-800">Staff Directory</h3>
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, Dept or ID"
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-brand transition-all"
              />
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Employee</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Department</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400">Employee ID</th>
                  <th className="p-4 text-[10px] uppercase tracking-widest font-black text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, i) => (
                  <tr key={emp._id || i} className="group hover:bg-blue-50/50 border-b border-slate-100 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-brand uppercase">
                          {emp.name?.[0]}
                        </div>
                        <span className="font-bold text-sm text-slate-700">{emp.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-sm text-slate-600">{emp.department}</td>
                    <td className="p-4 font-mono text-sm text-brand">{emp.empId || "---"}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: emp._id, name: emp.name })}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        >
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold mb-6 text-slate-800">{editingEmployee ? "Edit Employee" : "New Employee"}</h3>
            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  required
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-brand transition-all"
                  placeholder="e.g. John Wick"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  required
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-brand transition-all"
                  placeholder="e.g. HR, Engineering..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 ml-1">Employee ID</label>
                <input
                  type="text"
                  value={formData.empId}
                  required
                  onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-brand transition-all font-mono"
                  placeholder="EMP-XXXX"
                />
              </div>
              <button
                disabled={submitting}
                className="w-full bg-brand py-4 rounded-xl font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand-light transition-all mt-4 disabled:opacity-50"
              >
                {submitting ? "Processing..." : editingEmployee ? "Update Record" : "Register Employee"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 sm:p-8 text-center shadow-2xl"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="text-red-600" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Are you sure?</h3>
            <p className="text-slate-500 text-sm mb-6 sm:mb-8">
              This will permanently remove{" "}
              <span className="text-slate-800 font-bold">{confirmDelete.name}</span> from the directory.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="py-3 bg-slate-100 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                className="py-3 bg-red-500 rounded-xl text-sm font-bold hover:bg-red-600 transition-all text-white shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function AdminStat({ label, count, icon }: { label: string; count: string; icon: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all cursor-default">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
          {icon}
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black font-mono text-slate-800">{count}</p>
      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{label}</p>
    </div>
  );
}
