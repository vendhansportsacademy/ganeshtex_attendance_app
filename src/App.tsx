import { useState, useEffect, ReactNode, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, LayoutDashboard, LogOut, Calendar, Users } from "lucide-react";
import { api } from "./lib/api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [activeTab, setActiveTab] = useState<"attendance" | "admin">("attendance");
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 selection:bg-brand/30">
      {/* Top Navigation Bar */}
      <nav className="glass border-b border-blue-100/50 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shadow-md">
            <Clock className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-blue-900">Chronos</h1>
        </div>

        <div className="flex bg-blue-50/80 p-1 rounded-xl border border-blue-100">
          <button
            onClick={() => setActiveTab("attendance")}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              activeTab === "attendance"
                ? "bg-brand text-white shadow-md"
                : "text-blue-600/60 hover:text-blue-700"
            )}
          >
            Register
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              activeTab === "admin"
                ? "bg-brand text-white shadow-md"
                : "text-blue-600/60 hover:text-blue-700"
            )}
          >
            Management
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-12 bg-gradient-to-br from-blue-50/30 via-white/50 to-slate-100/30 min-h-screen">
        <AnimatePresence mode="wait">
          {activeTab === "attendance" ? (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Dashboard />
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group",
        active
          ? "bg-brand text-white shadow-lg shadow-brand/20"
          : "text-blue-600/40 hover:text-blue-700 hover:bg-blue-50"
      )}
    >
      <span className={cn(active ? "text-white" : "text-blue-600/40 group-hover:text-blue-600")}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
