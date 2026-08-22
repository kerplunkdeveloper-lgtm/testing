import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useGetTasksQuery, useUpdateTaskMutation } from "../../features/api/apiSlice";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowRight, FiCheckCircle, FiClock, FiX } from "react-icons/fi";
import axiosInstance from "../../services/axiosInstance";
import toast from "react-hot-toast";

const formatDurationHM = (ms = 0) => {
  if (!ms || isNaN(ms)) return "0h 00m";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

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
            workingDays: data.data.workingDays || [1, 2, 3, 4, 5, 6],
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
    const workingDays =
      officeHours.workingDays && officeHours.workingDays.length > 0
        ? officeHours.workingDays
        : [1, 2, 3, 4, 5, 6];
    if (!workingDays.includes(day)) return false;
    const hour = now.getHours();
    return hour >= officeHours.startHour && hour < officeHours.endHour;
  };

  useEffect(() => {
    if (!tasks || tasks.length === 0 || !currentUserId) return;

    // Check if prompt was already dismissed today
    const todayStr = new Date().toDateString();
    const storageKey = `resume_prompt_shown_${currentUserId}_${todayStr}`;
    if (localStorage.getItem(storageKey)) return;

    // Check if we are currently in business hours
    if (!isCurrentlyInBusinessHours()) return;

    // Find tasks/subtasks assigned to user that are in "On Hold"
    const onHoldItems = [];

    tasks.forEach((t) => {
      const isAssignee = Array.isArray(t.assignedTo)
        ? t.assignedTo.some((u) => (u?._id || u) === currentUserId)
        : (t.assignedTo?._id || t.assignedTo) === currentUserId;

      if (isAssignee && t.status === "On Hold" && t.autoPaused) {
        onHoldItems.push({
          task: t,
          target: t,
          isSubtask: false,
          totalTrackedTime: t.totalTrackedTime || 0,
          pausedAt: t.holdStartedAt ? new Date(t.holdStartedAt) : t.pausedAt ? new Date(t.pausedAt) : new Date(t.updatedAt),
        });
      }

      t.subtasks?.forEach((sub) => {
        const isSubAssignee = Array.isArray(sub.assignedTo)
          ? sub.assignedTo.some((u) => (u?._id || u) === currentUserId)
          : (sub.assignedTo?._id || sub.assignedTo) === currentUserId;

        if (isSubAssignee && sub.status === "On Hold" && sub.autoPaused) {
          onHoldItems.push({
            task: t,
            target: sub,
            isSubtask: true,
            totalTrackedTime: sub.totalTrackedTime || 0,
            pausedAt: sub.holdStartedAt ? new Date(sub.holdStartedAt) : sub.pausedAt ? new Date(sub.pausedAt) : new Date(t.updatedAt),
          });
        }
      });
    });

    if (onHoldItems.length > 0) {
      // Sort most recently paused first
      onHoldItems.sort((a, b) => b.pausedAt - a.pausedAt);

      setResumeTaskData({
        totalCount: onHoldItems.length,
        item: onHoldItems[0],
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

  const handleContinueTask = async () => {
    if (!resumeTaskData) return;
    const { item } = resumeTaskData;

    const todayStr = new Date().toDateString();
    const storageKey = `resume_prompt_shown_${currentUserId}_${todayStr}`;
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);

    try {
      if (item.isSubtask) {
        const updatedSubtasks = item.task.subtasks.map((sub) => {
          if (sub._id === item.target._id) {
            return { ...sub, status: "Pending" };
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
          taskData: { status: "Pending" },
        }).unwrap();
      }
      toast.success("Task status updated to Pending. Ready for today's work!");
    } catch (err) {
      console.error("Failed to continue task:", err);
      toast.error(err?.data?.message || "Failed to update task status.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && resumeTaskData && (
        <div className="fixed inset-0 z-[999998] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", duration: 0.45 }}
            className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
          >
            {/* Decorative top strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-blue-500 to-indigo-600" />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
            >
              <FiX size={16} />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 text-2xl">
                ⏳
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 leading-tight">
                  Task was On Hold yesterday
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  This task was placed On Hold at the end of the previous working day.
                </p>
              </div>
            </div>

            {/* Task Title */}
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-left mb-4">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">
                Task
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                {resumeTaskData.item.target.title || resumeTaskData.item.task.title}
              </span>
            </div>

            {/* Status Transition Badge */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 dark:from-slate-900/80 dark:via-blue-950/20 dark:to-slate-900/80 border border-slate-200/80 dark:border-slate-800 mb-4">
              <div className="text-left space-y-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Status will change:
                </span>
                <div className="flex items-center gap-2 font-black text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-[10px]">
                    ON HOLD
                  </span>
                  <FiArrowRight size={12} className="text-blue-500" />
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 text-[10px]">
                    PENDING
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Yesterday's Tracked:
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {formatDurationHM(resumeTaskData.item.totalTrackedTime)}
                </span>
              </div>
            </div>

            {/* Timer Notice */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-left mb-5">
              <FiClock size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="text-[11px] text-blue-900 dark:text-blue-200 font-semibold leading-tight">
                Today's productivity tracking will start from:{" "}
                <span className="font-mono font-black text-blue-700 dark:text-blue-300">
                  00:00:00
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div>
              <button
                type="button"
                onClick={handleContinueTask}
                className="w-full py-3.5 px-5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <FiCheckCircle size={15} />
                Continue Task
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ResumePausedTasksPopup;

