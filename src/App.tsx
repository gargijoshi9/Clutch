import React, { useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation, Outlet } from "react-router-dom";
import { LayoutGrid, Calendar, ListTodo, Settings } from "lucide-react";

// Screen imports
import OnboardingScreen from "./screens/Onboarding";
import Dashboard from "./screens/Dashboard";
import ScheduleScreen from "./screens/Schedule";
import TasksScreen from "./screens/Tasks";
import SettingsScreen from "./screens/Settings";

// Route guard helper
function RootRedirect() {
  const hasProfile = !!localStorage.getItem("clutch_profile");
  return hasProfile ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboard" replace />;
}

// App Layout with Bottom Navigation
function AppLayout() {
  const location = useLocation();
  const path = location.pathname;

  // Show bottom nav on all screens EXCEPT Onboarding
  const showBottomNav = path !== "/onboard";

  return (
    <div className="min-h-screen bg-[#F7F6F3] flex justify-center w-full">
      {/* Centered Phone Viewport Simulator */}
      <div className="w-full max-w-[390px] min-h-screen bg-[#F7F6F3] flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.02)]">
        
        {/* Page Content */}
        <div className="flex-1 pb-16">
          <Outlet />
        </div>

        {/* Bottom Navigation Bar */}
        {showBottomNav && (
          <nav className="fixed bottom-0 w-full max-w-[390px] bg-white border-t border-[#E0DED9] z-40 px-6 py-2.5 flex items-center justify-between">
            {/* Dashboard Link */}
            <Link
              to="/dashboard"
              className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${
                path === "/dashboard" ? "text-[#1A1A1A]" : "text-[#BDBBB6] hover:text-[#888780]"
              }`}
            >
              <LayoutGrid size={18} />
              <span className="text-[10px] font-semibold tracking-wider uppercase">Today</span>
            </Link>

            {/* Schedule Link */}
            <Link
              to="/schedule"
              className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${
                path === "/schedule" ? "text-[#1A1A1A]" : "text-[#BDBBB6] hover:text-[#888780]"
              }`}
            >
              <Calendar size={18} />
              <span className="text-[10px] font-semibold tracking-wider uppercase">Schedule</span>
            </Link>

            {/* Tasks Link */}
            <Link
              to="/tasks"
              className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${
                path === "/tasks" ? "text-[#1A1A1A]" : "text-[#BDBBB6] hover:text-[#888780]"
              }`}
            >
              <ListTodo size={18} />
              <span className="text-[10px] font-semibold tracking-wider uppercase">Tasks</span>
            </Link>

            {/* Settings Link */}
            <Link
              to="/settings"
              className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${
                path === "/settings" ? "text-[#1A1A1A]" : "text-[#BDBBB6] hover:text-[#888780]"
              }`}
            >
              <Settings size={18} />
              <span className="text-[10px] font-semibold tracking-wider uppercase">Settings</span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/onboard" element={<OnboardingScreen />} />
        
        {/* Navigated layout screens wrapper */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/schedule" element={<ScheduleScreen />} />
          <Route path="/tasks" element={<TasksScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Router>
  );
}
