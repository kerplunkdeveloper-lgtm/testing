import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { FiCheckSquare, FiBriefcase } from "react-icons/fi";
import {
  useGetTasksQuery,
  useGetProjectsQuery,
} from "../../features/api/apiSlice";
import { getUsers } from "../../features/users/userSlice";

const TaskOverviewTab = lazy(() => import("./TaskOverviewTab"));
const MyTasksTab = lazy(() => import("./MyTasksTab"));

const TabLoadingFallback = () => (
  <div className="flex items-center justify-center p-12 space-x-2">
    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading tasks...</span>
  </div>
);

const Task = () => {
  const { user } = useSelector((state) => state.auth);
  const currentUserId = user?._id || user?.id;
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const departmentParam = searchParams.get("department") || searchParams.get("dept");

  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  const canSeeTaskOverview =
    user?.department?.toLowerCase() === "social media manager" ||
    user?.department?.toLowerCase() === "social media executive" ||
    user?.role === "admin" ||
    user?.role === "operationmanager" ||
    user?.role === "managingpartner" ||
    Boolean(departmentParam);

  const [activeTab, setActiveTab] = useState(
    canSeeTaskOverview ? "Task Overview" : "myTasks",
  );

  // Sync activeTab if user role loads after initial mount or departmentParam present
  useEffect(() => {
    if (departmentParam) {
      setActiveTab("Task Overview");
    } else if (!canSeeTaskOverview && activeTab === "Task Overview") {
      setActiveTab("myTasks");
    }
  }, [canSeeTaskOverview, activeTab, departmentParam]);

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
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 px-2 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("Task Overview")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                activeTab === "Task Overview"
                  ? "theme-bg-accent text-white shadow-md"
                  : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              <FiBriefcase size={14} className={activeTab === "Task Overview" ? "text-white" : "text-slate-500"} />
              <span>Task overview</span>
              <span
                className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-black flex items-center justify-center ${
                  activeTab === "Task Overview"
                    ? "bg-white/30 text-white"
                    : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                }`}
              >
                {filteredOverviewCount !== null ? filteredOverviewCount : assignedTasksCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("myTasks")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                activeTab === "myTasks"
                  ? "theme-bg-accent text-white shadow-md"
                  : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              <FiCheckSquare size={14} className={activeTab === "myTasks" ? "text-white" : "text-slate-500"} />
              <span>My Tasks</span>
              <span
                className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-black flex items-center justify-center ${
                  activeTab === "myTasks"
                    ? "bg-white/30 text-white"
                    : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                }`}
              >
                {myTasksCount}
              </span>
            </button>
          </div>
          
          {/* Portal target for right-side actions (like Export / Hide Column) */}
          <div id="task-actions-portal" className="flex items-center gap-2 shrink-0"></div>
        </div>
      )}

      {/* SEPARATE COMPONENT TAB RENDER WITH SUSPENSE */}
      <Suspense fallback={<TabLoadingFallback />}>
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
      </Suspense>
    </div>
  );
};

export default Task;
