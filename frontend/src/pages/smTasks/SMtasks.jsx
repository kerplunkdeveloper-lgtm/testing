import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheckSquare, FiCalendar } from "react-icons/fi";
import SMPostTasks from "./SMPostTasks";
import SMContentCalendar from "./SMContentCalendar";

const SMtasks = () => {
  const [activeTab, setActiveTab] = useState("post-tasks");

  const tabs = [
    {
      id: "post-tasks",
      label: "SM Post tasks",
      icon: FiCheckSquare,
    },
    {
      id: "content-calendar",
      label: "SM Content Calendar",
      icon: FiCalendar,
    },
  ];

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      {/* TABS HEADER */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm transition-all relative cursor-pointer whitespace-nowrap rounded-t-xl ${
                isActive
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10 border border-b-0 border-indigo-200/60 dark:border-indigo-500/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="smTasksTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <div className=" min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTab === "post-tasks" && (
            <motion.div
              key="post-tasks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <SMPostTasks />
            </motion.div>
          )}

          {activeTab === "content-calendar" && (
            <motion.div
              key="content-calendar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <SMContentCalendar />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SMtasks;
