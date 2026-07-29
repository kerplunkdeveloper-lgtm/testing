import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSettings, FiX, FiMoon, FiSun, FiMonitor, FiLayout, FiSidebar } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";

const ThemeSettingsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    fontFamily,
    setFontFamily,
    sidebarLayout,
    setSidebarLayout,
  } = useTheme();

  const colors = [
    { id: "default", hex: "#3b82f6", name: "Ocean Blue" },
    { id: "emerald", hex: "#10b981", name: "Emerald Green" },
    { id: "violet", hex: "#7c3aed", name: "Royal Purple" },
    { id: "amber", hex: "#f59e0b", name: "Sunset Orange" },
    { id: "rose", hex: "#f43f5e", name: "Hot Pink" },
    { id: "cyan", hex: "#06b6d4", name: "Electric Cyan" },
    { id: "lime", hex: "#84cc16", name: "Neon Lime" },
    { id: "fuchsia", hex: "#d946ef", name: "Fuchsia Glow" },
    { id: "teal", hex: "#0d9488", name: "Deep Teal" },
    { id: "red", hex: "#dc2626", name: "Crimson Red" },
    { id: "indigo", hex: "#4f46e5", name: "Deep Indigo" },
    { id: "gold", hex: "#b45309", name: "Luxury Gold" },
    { id: "mauve", hex: "#582c4d", name: "Dark Mauve" },
    { id: "lavender", hex: "#d5cfe1", name: "Lavender Mist" },
  ];

  const fonts = [
    { id: "inter", name: "Inter", class: "font-inter" },
    { id: "poppins", name: "Poppins", class: "font-poppins" },
    { id: "roboto", name: "Roboto", class: "font-roboto" },
    { id: "outfit", name: "Outfit", class: "font-outfit" },
    { id: "jakarta", name: "Plus Jakarta", class: "font-jakarta" },
    { id: "fira", name: "Fira Sans", class: "font-fira" },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-35 -translate-y-1/2 z-40 bg-white dark:bg-[#0f172a] p-3 rounded-l-xl shadow-lg border-y border-l border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
      >
        <FiSettings className="w-5 h-5 animate-[spin_4s_linear_infinite]" />
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-white/5 dark:bg-black/20 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      {/* Offcanvas Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-3xl border-l border-white/50 dark:border-white/10 z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <FiSettings className="w-4 h-4 theme-text-accent" /> Theme Builder
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-8 sidebar-scrollbar">
              
              {/* Theme Mode */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Color Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "light", icon: FiSun, label: "Light" },
                    { id: "dark", icon: FiMoon, label: "Dark" },
                    { id: "system", icon: FiMonitor, label: "System" }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setTheme(mode.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${
                        theme === mode.id 
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" 
                          : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <mode.icon className="w-4 h-4" />
                      <span className="text-[9px] font-bold">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accent Color</label>
                <div className="flex flex-wrap gap-2.5 mt-4">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setAccentColor(c.id)}
                      title={c.name}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        accentColor === c.id ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0b1120] ring-current scale-110 shadow-lg" : "hover:scale-110 shadow-sm"
                      }`}
                      style={{ backgroundColor: c.hex, color: c.hex }}
                    >
                      {accentColor === c.id && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Typography</label>
                <div className="grid grid-cols-1 gap-2">
                  {fonts.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFontFamily(f.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        fontFamily === f.id
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" 
                          : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/10"
                      } ${f.class}`}
                    >
                      <span className="text-sm font-medium">{f.name}</span>
                      <span className="text-[9px] font-black tracking-wider opacity-60">Abc</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ThemeSettingsPanel;
