import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useGetTasksQuery, useUpdateTaskMutation } from "../../features/api/apiSlice";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlay, FiX } from "react-icons/fi";
import axiosInstance from "../../services/axiosInstance";
import toast from "react-hot-toast";

const ResumePausedTasksPopup = () => {
  const { user } = useSelector((state) => state.auth);
  const currentUserId = user?._id || user?.id;

  const { data: tasks = [] } = useGetTasksQuery(undefined, {
    skip: !currentUserId,
  });

  const [updateTask] = useUpdateTaskMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [resumeTaskData, setResumeTaskData] = useState(null);
  const [officeHours, setOfficeHours] = useState({ startHour: 9, endHour: 19 });

  // Fetch office hours settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await axiosInstance.get("/settings/office-hours");
        if (data?.success) {
          setOfficeHours({
            startHour: data.data.startHour,
            endHour: data.data.endHour,
          });
        }
      } catch (err) {
        console.error("Failed to fetch office hours in resume popup:", err);
      }
    };
    if (currentUserId) {
      fetchSettings();
    }
  }, [currentUserId]);

  const isCurrentlyInBusinessHours = () => {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false; // weekends
    const hour = now.getHours();
    return hour >= officeHours.startHour && hour < officeHours.endHour;
  };

  const formatPausedTime = (dateVal) => {
    if (!dateVal) return "";
    const date = new Date(dateVal);
    const now = new Date();
    
    const isTodayVal = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterdayVal = date.toDateString() === yesterday.toDateString();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    if (isTodayVal) {
      return `Today ${timeStr}`;
    } else if (isYesterdayVal) {
      return `Yesterday ${timeStr}`;
    } else {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[date.getMonth()]} ${date.getDate()}, ${timeStr}`;
    }
  };

  useEffect(() => {
    if (!tasks || tasks.length === 0 || !currentUserId) return;

    // Check if prompt was already shown today
    const todayStr = new Date().toDateString();
    const storageKey = `resume_prompt_shown_${currentUserId}_${todayStr}`;
    if (localStorage.getItem(storageKey)) return;

    // Check if we are currently in business hours
    if (!isCurrentlyInBusinessHours()) return;

    // Find all paused tasks/subtasks assigned to the user
    const pausedItems = [];

    tasks.forEach((t) => {
      const isAssignee = (t.assignedTo?._id || t.assignedTo) === currentUserId;
      if (isAssignee && t.status === "On Hold") {
        pausedItems.push({
          task: t,
          target: t,
          isSubtask: false,
          pausedAt: t.pausedAt ? new Date(t.pausedAt) : new Date(t.updatedAt),
        });
      }

      t.subtasks?.forEach((sub) => {
        const isSubAssignee = (sub.assignedTo?._id || sub.assignedTo) === currentUserId;
        if (isSubAssignee && sub.status === "On Hold") {
          pausedItems.push({
            task: t,
            target: sub,
            isSubtask: true,
            pausedAt: sub.pausedAt ? new Date(sub.pausedAt) : new Date(t.updatedAt),
          });
        }
      });
    });

    if (pausedItems.length > 0) {
      // Sort to get the most recently paused one first
      pausedItems.sort((a, b) => b.pausedAt - a.pausedAt);

      setResumeTaskData({
        totalCount: pausedItems.length,
        item: pausedItems[0],
      });
      setIsOpen(true);
    }
  }, [tasks, currentUserId, officeHours]);

  const handleClose = () => {
    const todayStr = new Date().toDateString();
    const storageKey = `resume_prompt_shown_${currentUserId}_${todayStr}`;
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
  };

  const handleResume = async () => {
    if (!resumeTaskData) return;
    const { item } = resumeTaskData;
    
    // Mark as shown for today
    const todayStr = new Date().toDateString();
    const storageKey = `resume_prompt_shown_${currentUserId}_${todayStr}`;
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);

    try {
      if (item.isSubtask) {
        const updatedSubtasks = item.task.subtasks.map((sub) => {
          if (sub._id === item.target._id) {
            return { ...sub, status: "In Progress" };
          }
          return sub;
        });
        await updateTask({
          id: item.task._id,
          taskData: { subtasks: updatedSubtasks },
        }).unwrap();
      } else {
        await updateTask({
          id: item.task._id,
          taskData: { status: "In Progress" },
        }).unwrap();
      }
      toast.success("Task resumed successfully!");
    } catch (err) {
      console.error("Failed to resume task:", err);
      toast.error(err?.data?.message || "Failed to resume task.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && resumeTaskData && (
        <div className="fixed inset-0 z-[999998] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-sm bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden"
          >
            {/* Decorative top strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
            >
              <FiX size={16} />
            </button>

            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl mt-2 animate-bounce">👋</span>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                Welcome Back
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                You have {resumeTaskData.totalCount} paused {resumeTaskData.totalCount === 1 ? "task" : "tasks"}.
              </p>
            </div>

            {/* Task Info Panel */}
            <div className="my-5 p-4 rounded-2xl bg-slate-50/85 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-left space-y-3">
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                Continue where you left off.
              </div>
              <div className="h-px bg-slate-200/60 dark:bg-slate-800/80" />
              <div className="space-y-2">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    Task
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug truncate block">
                    {resumeTaskData.item.target.title}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    Paused
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {formatPausedTime(resumeTaskData.item.pausedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleResume}
                className="w-full py-3 px-5 rounded-2xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FiPlay size={12} fill="currentColor" />
                Resume
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ResumePausedTasksPopup;
