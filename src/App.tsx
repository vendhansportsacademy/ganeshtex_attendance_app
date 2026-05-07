import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, Settings } from "lucide-react";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import { cn } from "./lib/utils";

export default function App() {
  const [activeTab, setActiveTab] = useState<"attendance" | "admin">("attendance");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-brand to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
                <LayoutDashboard className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-800 hidden sm:block">
                Ganesh<span className="text-brand">Tex</span>
              </h1>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setActiveTab("attendance")}
                className={cn(
                  "px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === "attendance"
                    ? "bg-white text-slate-800 shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <LayoutDashboard size={18} />
                <span>Attendance</span>
              </button>
              <button
                onClick={() => setActiveTab("admin")}
                className={cn(
                  "px-4 sm:px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === "admin"
                    ? "bg-white text-slate-800 shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Settings size={18} />
                <span>Admin</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative">
        <AnimatePresence mode="wait">
          {activeTab === "attendance" ? (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Dashboard />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200 mt-8">
        <p>© 2025 Ganesh Tex Attendance System</p>
      </footer>
    </div>
  );
}
