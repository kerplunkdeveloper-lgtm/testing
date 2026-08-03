import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { FiCheckSquare, FiBriefcase } from "react-icons/fi";
import {
  useGetTasksQuery,
  useGetProjectsQuery,
} from "../../features/api/apiSlice";
import TaskOverviewTab from "./TaskOverviewTab";
import MyTasksTab from "./MyTasksTab";

const Task = () => {
  const { user } = useSelector((state) => state.auth);
  const currentUserId = user?._id || user?.id;

  const canSeeTaskOverview =
    user?.department?.toLowerCase() === "social media manager" ||
    user?.department?.toLowerCase() === "social media executive" ||
    user?.role === "admin" ||
    user?.role === "operationmanager" ||
    user?.role === "managingpartner";

  const [activeTab, setActiveTab] = useState(
    canSeeTaskOverview ? "Task Overview" : "myTasks",
  );

  // Sync activeTab if user role loads after initial mount
  useEffect(() => {
    if (!canSeeTaskOverview && activeTab === "Task Overview") {
      setActiveTab("myTasks");
    }
  }, [canSeeTaskOverview, activeTab]);

  // Common quick date filter state passed to TaskOverviewTab
  const [dateFilter, setDateFilter] = useState(() => {
    try {
      const saved = localStorage.getItem("task_date_filter");
      return saved || "All";
    } catch {
      return "All";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("task_date_filter", dateFilter);
    } catch (e) {
      console.error("Failed to save date filter:", e);
    }
  }, [dateFilter]);

  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateDropdownRef = useRef(null);
  const [filteredOverviewCount, setFilteredOverviewCount] = useState(null);

  const { data: tasks = [], isLoading: loading } = useGetTasksQuery(undefined, {
    skip: !user,
  });

  const { data: projects = [] } = useGetProjectsQuery(undefined, {
    skip: !user,
  });

  const myTasksCount = React.useMemo(() => {
    return tasks.filter((task) => {
      const taskUserId = task.assignedTo?._id || task.assignedTo;
      return taskUserId === currentUserId;
    }).length;
  }, [tasks, currentUserId]);

  const assignedTasksCount = React.useMemo(() => {
    const role = user?.role?.toLowerCase();
    if (role === "admin" || role === "operationmanager" || role === "managingpartner") {
      return tasks.length;
    }
    return tasks.filter((task) => {
      const creatorId = task.createdBy?._id || task.createdBy;
      return creatorId === currentUserId;
    }).length;
  }, [tasks, currentUserId, user]);

  return (
    <div className="px-0 py-1 space-y-4 pb-16">
      {/* TABS HEADER — only for managers/admins */}
      {canSeeTaskOverview && (
        <div className="flex items-center justify-center gap-2 border-b border-slate-200/80 dark:border-white/10 px-2 pb-3 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab("Task Overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === "Task Overview"
                ? "bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black shadow-xl shadow-blue-500"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            <FiBriefcase size={16} />
            <span>Task overview</span>
            <span
              className={`ml-1 text-[13px] px-2 py-0.5 rounded-full font-black ${
                activeTab === "Task Overview"
                  ? "bg-white/50 dark:bg-black/20  "
                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
              }`}
            >
              {filteredOverviewCount !== null ? filteredOverviewCount : assignedTasksCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("myTasks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "myTasks"
                ? "bg-blue-600 dark:bg-[#3b82f6] text-white dark:text-black shadow-md shadow-blue-500/20"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            <FiCheckSquare size={14} />
            <span>My Tasks</span>
            <span
              className={`ml-1 text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeTab === "myTasks"
                  ? "bg-white/20 dark:bg-black/20 text-white dark:text-black"
                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
              }`}
            >
              {myTasksCount}
            </span>
          </button>
        </div>
      )}

      {/* SEPARATE COMPONENT TAB RENDER */}
      {activeTab === "Task Overview" ? (
        <TaskOverviewTab
          tasks={tasks}
          projects={projects}
          currentUserId={currentUserId}
          user={user}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          showDateDropdown={showDateDropdown}
          setShowDateDropdown={setShowDateDropdown}
          dateDropdownRef={dateDropdownRef}
          onFilteredCountChange={setFilteredOverviewCount}
        />
      ) : (
        <MyTasksTab
          tasks={tasks}
          projects={projects}
          currentUserId={currentUserId}
          user={user}
          loading={loading}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
        />
      )}
    </div>
  );
};

export default Task;
