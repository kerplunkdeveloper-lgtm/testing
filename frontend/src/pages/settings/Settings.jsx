import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../../context/ThemeContext";
import { getProfile } from "../../features/profile/profileSlice";
import axiosInstance from "../../services/axiosInstance";
import toast from "react-hot-toast";
import {
  FiUser,
  FiMail,
  FiSliders,
  FiVolume2,
  FiVolumeX,
  FiMoon,
  FiSun,
  FiMonitor,
  FiClock,
} from "react-icons/fi";
import { LuPaintbrush } from "react-icons/lu";

const colors = [
  {
    id: "default",
    name: "Ocean Blue",
    lightGradient: "linear-gradient(135deg, #3b82f6, #6366f1)",
    darkGradient: "linear-gradient(135deg, #3b82f6, #60a5fa)",
  },
  {
    id: "emerald",
    name: "Emerald Green",
    lightGradient: "linear-gradient(135deg, #10b981, #34d399)",
    darkGradient: "linear-gradient(135deg, #34d399, #6ee7b7)",
  },
  {
    id: "violet",
    name: "Royal Purple",
    lightGradient: "linear-gradient(135deg, #7c3aed, #a78bfa)",
    darkGradient: "linear-gradient(135deg, #a78bfa, #c4b5fd)",
  },
  {
    id: "amber",
    name: "Sunset Orange",
    lightGradient: "linear-gradient(135deg, #f59e0b, #fb923c)",
    darkGradient: "linear-gradient(135deg, #fbbf24, #fcd34d)",
  },
  {
    id: "rose",
    name: "Hot Pink",
    lightGradient: "linear-gradient(135deg, #f43f5e, #fb7185)",
    darkGradient: "linear-gradient(135deg, #fb7185, #fda4af)",
  },
  {
    id: "cyan",
    name: "Electric Cyan",
    lightGradient: "linear-gradient(135deg, #06b6d4, #22d3ee)",
    darkGradient: "linear-gradient(135deg, #22d3ee, #67e8f9)",
  },
  {
    id: "lime",
    name: "Neon Lime",
    lightGradient: "linear-gradient(135deg, #84cc16, #a3e635)",
    darkGradient: "linear-gradient(135deg, #84cc16, #a3e635)",
  },
  {
    id: "fuchsia",
    name: "Fuchsia Glow",
    lightGradient: "linear-gradient(135deg, #d946ef, #e879f9)",
    darkGradient: "linear-gradient(135deg, #e879f9, #f0abfc)",
  },
  {
    id: "teal",
    name: "Deep Teal",
    lightGradient: "linear-gradient(135deg, #0d9488, #2dd4bf)",
    darkGradient: "linear-gradient(135deg, #2dd4bf, #5eead4)",
  },
  {
    id: "red",
    name: "Crimson Red",
    lightGradient: "linear-gradient(135deg, #dc2626, #f87171)",
    darkGradient: "linear-gradient(135deg, #f87171, #fca5a5)",
  },
  {
    id: "indigo",
    name: "Deep Indigo",
    lightGradient: "linear-gradient(135deg, #4f46e5, #818cf8)",
    darkGradient: "linear-gradient(135deg, #818cf8, #a5b4fc)",
  },
  {
    id: "gold",
    name: "Luxury Gold",
    lightGradient: "linear-gradient(135deg, #b45309, #d97706)",
    darkGradient: "linear-gradient(135deg, #f59e0b, #fcd34d)",
  },
];

const Settings = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { profile } = useSelector((s) => s.profile);
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    soundEnabled,
    setSoundEnabled,
  } = useTheme();

  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(19);
  const [loadingHours, setLoadingHours] = useState(true);
  const [savingHours, setSavingHours] = useState(false);

  const canChangeOfficeHours = user?.role === "admin" || user?.role === "operationmanager";

  useEffect(() => {
    dispatch(getProfile());
  }, [dispatch, user]);

  useEffect(() => { 
    const fetchOfficeHours = async () => {
      try {
        const response = await axiosInstance.get("/settings/office-hours");
        if (response.data?.success) {
          setStartHour(response.data.data.startHour);
          setEndHour(response.data.data.endHour);
        }
      } catch (err) {
        console.error("Failed to fetch office hours:", err);
      } finally {
        setLoadingHours(false);
      }
    };
    fetchOfficeHours();
  }, []);

  const handleSaveHours = async () => {
    setSavingHours(true);
    try {
      const response = await axiosInstance.put("/settings/office-hours", {
        startHour,
        endHour,
      });
      if (response.data?.success) {
        toast.success("Office working hours updated successfully!");
      }
    } catch (err) {
      toast.error("Failed to update working hours");
      console.error(err);
    } finally {
      setSavingHours(false);
    }
  };


  const initials = user?.name ? user.name.charAt(0).toUpperCase() : "U";
  const avatarUrl = profile?.profileImage?.url;

  return (
    <div className="min-h-screen">
      <div className="px-3 sm:px-5 py-4 sm:py-6 max-w-4xl mx-auto animate-fadeIn">
        {/* PAGE TITLE */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            System Settings
          </h1>
          <p className="text-xs theme-text-secondary mt-1">
            Configure your personal preferences, theme presets and
            notifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-5">
          {/* LEFT COLUMN: MINI PROFILE CARD */}
          <div className="theme-bg-card border theme-border rounded-2xl p-5 shadow-sm flex flex-col items-center text-center h-fit">
            <div className="relative mb-4 shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 dark:from-[#3b82f6] dark:to-emerald-500 p-[2.5px] shadow-md">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-800 dark:text-[#3b82f6] font-black text-xl">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-base font-black theme-text-primary leading-tight tracking-tight">
              {user?.name || "User"}
            </h2>
            <p className="text-[11px] theme-text-secondary mt-1 select-all font-medium">
              {user?.email}
            </p>

            <div className="flex flex-col gap-1.5 w-full mt-5">
              <div className="flex items-center justify-between rounded-xl px-3 py-2 text-left border theme-border">
                <span className="text-[10px] font-black theme-text-secondary uppercase tracking-wider">
                  Role
                </span>
                <span className="text-[10px] font-bold theme-text-primary capitalize bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded-md">
                  {user?.role || "Member"}
                </span>
              </div>

              {user?.department && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2 text-left border theme-border">
                  <span className="text-[10px] font-black theme-text-secondary uppercase tracking-wider">
                    Department
                  </span>
                  <span className="text-[10px] font-bold theme-text-primary capitalize bg-blue-50 dark:bg-[#3b82f6]/10 border border-blue-100 dark:border-[#3b82f6]/25 px-2 py-0.5 rounded-md">
                    {user.department}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: PREFERENCES */}
          <div className="space-y-5">
            {/* THEME SHORTCUTS & PREFERENCES */}
            <div className="theme-bg-card border theme-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b theme-border pb-3">
                <LuPaintbrush className="text-blue-500 dark:text-[#3b82f6] text-lg" />
                <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider">
                  Theme Preference
                </h3>
              </div>

              {/* LIGHT / DARK SHORTCUTS */}
              <div className="mb-6">
                <label className="block text-xs font-black theme-text-secondary uppercase tracking-wider mb-2.5">
                  App Appearance
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer text-center ${
                      theme === "light"
                        ? "theme-border-accent bg-indigo-500/5 text-blue-500 dark:text-[#3b82f6] border-blue-500 dark:border-[#3b82f6]"
                        : "theme-border theme-bg-card theme-text-secondary hover:theme-bg-main"
                    }`}
                  >
                    <FiSun size={16} />
                    <span className="text-[10px] font-bold">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer text-center ${
                      theme === "dark"
                        ? "theme-border-accent bg-indigo-500/5 text-blue-500 dark:text-[#3b82f6] border-blue-500 dark:border-[#3b82f6]"
                        : "theme-border theme-bg-card theme-text-secondary hover:theme-bg-main"
                    }`}
                  >
                    <FiMoon size={16} />
                    <span className="text-[10px] font-bold">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer text-center ${
                      theme === "system"
                        ? "theme-border-accent bg-indigo-500/5 text-blue-500 dark:text-[#3b82f6] border-blue-500 dark:border-[#3b82f6]"
                        : "theme-border theme-bg-card theme-text-secondary hover:theme-bg-main"
                    }`}
                  >
                    <FiMonitor size={16} />
                    <span className="text-[10px] font-bold">System</span>
                  </button>
                </div>
              </div>

              {/* ACCENT COLOR PRESET GRID */}
              <div>
                <label className="block text-xs font-black theme-text-secondary uppercase tracking-wider mb-3">
                  Accent Color Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {colors.map((color) => {
                    const isActive = accentColor === color.id;
                    const gradient =
                      theme === "dark"
                        ? color.darkGradient
                        : color.lightGradient;
                    return (
                      <button
                        key={color.id}
                        onClick={() => setAccentColor(color.id)}
                        className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer overflow-hidden group ${
                          isActive
                            ? "border-transparent ring-2 ring-offset-1 ring-offset-transparent"
                            : "theme-border theme-bg-card hover:theme-bg-main hover:shadow-sm"
                        }`}
                        style={
                          isActive
                            ? {
                                ringColor: "transparent",
                                boxShadow: `0 0 0 2px ${gradient.split(",")[1]?.trim().split(")")[0] ?? "#3b82f6"}`,
                              }
                            : {}
                        }
                      >
                        {/* Gradient swatch */}
                        <span
                          className="w-8 h-8 rounded-lg shrink-0 shadow-sm"
                          style={{ background: gradient }}
                        />
                        <span
                          className={`text-[11px] font-bold leading-tight ${
                            isActive
                              ? "theme-text-primary"
                              : "theme-text-secondary group-hover:theme-text-primary"
                          }`}
                        >
                          {color.name}
                        </span>
                        {isActive && (
                          <span
                            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black shadow"
                            style={{ background: gradient }}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SOUND SETTINGS */}
            <div className="theme-bg-card border theme-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b theme-border pb-3">
                <FiSliders className="text-blue-500 dark:text-[#3b82f6] text-lg" />
                <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider">
                  Preferences
                </h3>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-[#3b82f6]/10 flex items-center justify-center text-blue-500 dark:text-[#3b82f6]">
                    {soundEnabled ? (
                      <FiVolume2 size={16} />
                    ) : (
                      <FiVolumeX size={16} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black theme-text-primary">
                      Notification Sounds
                    </h4>
                    <p className="text-[9px] theme-text-secondary mt-0.5">
                      Play a chime when you receive notifications or messages.
                    </p>
                  </div>
                </div>

                {/* IOS-style toggle switch */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    soundEnabled
                      ? "theme-bg-accent"
                      : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      soundEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* BUSINESS HOURS INFO */}
            <div className="theme-bg-card border theme-border rounded-2xl p-5 shadow-sm mt-5">
              <div className="flex items-center justify-between mb-4 border-b theme-border pb-3">
                <div className="flex items-center gap-2">
                  <FiClock className="text-emerald-500 dark:text-emerald-400 text-lg animate-pulse" />
                  <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider">
                    Office Working Hours
                  </h3>
                  {!canChangeOfficeHours && (
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md border theme-border">
                      Read-Only
                    </span>
                  )}
                </div>
                {canChangeOfficeHours && (
                  <button
                    onClick={handleSaveHours}
                    disabled={savingHours || loadingHours}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[11px] tracking-wide shadow-md shadow-emerald-500/10 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingHours ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>

              {loadingHours ? (
                <div className="text-xs theme-text-secondary py-2">Loading hours config...</div>
              ) : (
                <div className="space-y-4">
                  {/* Select Hours Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider theme-text-secondary block">
                        Start Workday
                      </label>
                      <select
                        disabled={!canChangeOfficeHours}
                        value={startHour}
                        onChange={(e) => setStartHour(Number(e.target.value))}
                        className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold theme-text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#3b82f6] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i}>
                            {(() => {
                              const ampm = i >= 12 ? "PM" : "AM";
                              const hourVal = i % 12 === 0 ? 12 : i % 12;
                              return `${String(hourVal).padStart(2, "0")}:00 ${ampm}`;
                            })()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider theme-text-secondary block">
                        End Workday
                      </label>
                      <select
                        disabled={!canChangeOfficeHours}
                        value={endHour}
                        onChange={(e) => setEndHour(Number(e.target.value))}
                        className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold theme-text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#3b82f6] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i}>
                            {(() => {
                              const ampm = i >= 12 ? "PM" : "AM";
                              const hourVal = i % 12 === 0 ? 12 : i % 12;
                              return `${String(hourVal).padStart(2, "0")}:00 ${ampm}`;
                            })()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="h-px theme-border" />

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-450/15 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0 text-xs">
                      🚫
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-black theme-text-primary">
                        Sundays & Holidays
                      </h4>
                      <p className="text-[10px] theme-text-secondary mt-0.5">
                        Closed (Sundays are excluded from productivity tracking)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
