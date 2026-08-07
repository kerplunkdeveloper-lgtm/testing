import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useGetTasksQuery, useUpdateTaskMutation } from "../../features/api/apiSlice";
import { motion, AnimatePresence } from "framer-motion";
import { FiClock } from "react-icons/fi";

const OfficeHoursPausedPopup = () => {
  const { user } = useSelector((state) => state.auth);
  const currentUserId = user?._id || user?.id;

  const { data: tasks = [] } = useGetTasksQuery(undefined, {
    skip: !currentUserId,
  });

  const [updateTask] = useUpdateTaskMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [popupData, setPopupData] = useState(null);

  // Calculate working time of a task/subtask in milliseconds
  const calculateWorkingTime = (item) => {
    if (!item.actualStartTime) return 0;
    const start = new Date(item.actualStartTime).getTime();
    const end = item.pausedAt ? new Date(item.pausedAt).getTime() : Date.now();

    let totalPauseMs = 0;
    if (item.blockerHistory && item.blockerHistory.length > 0) {
      item.blockerHistory.forEach((h) => {
        if (h.pausedAt) {
          const p = new Date(h.pausedAt).getTime();
          let r = h.resumedAt ? new Date(h.resumedAt).getTime() : Date.now();
          if (r > end) r = end;
          if (r >= p) {
            totalPauseMs += r - p;
          }
        }
      });
    }

    if (item.isBlocked && item.blockerPausedAt) {
      const p = new Date(item.blockerPausedAt).getTime();
      if (p < end) {
        totalPauseMs += end - p;
      }
    }

    const elapsed = end - start - (item.totalPausedMs || 0) - totalPauseMs;
    return Math.max(0, elapsed);
  };

  const formatWorkingTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatPausedAt = (dateVal) => {
    if (!dateVal) return "07:00 PM";
    const date = new Date(dateVal);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  };

  // 1. Listen for background auto-pause (query updates)
  useEffect(() => {
    if (!tasks || tasks.length === 0 || !currentUserId) return;

    // Find any task assigned to current user that was auto-paused
    const autoPausedTask = tasks.find((t) => {
      const isAssignee = (t.assignedTo?._id || t.assignedTo) === currentUserId;
      const hasAutoPausedSubtask = t.subtasks?.some(
        (sub) => (sub.assignedTo?._id || sub.assignedTo) === currentUserId && sub.autoPaused
      );
      return isAssignee && (t.autoPaused || hasAutoPausedSubtask);
    });

    if (autoPausedTask) {
      const subtask = autoPausedTask.subtasks?.find(
        (sub) => (sub.assignedTo?._id || sub.assignedTo) === currentUserId && sub.autoPaused
      );
      const target = subtask || autoPausedTask;

      const workingTimeMs = calculateWorkingTime(target);
      const pausedAtStr = formatPausedAt(target.pausedAt);

      setPopupData({
        task: autoPausedTask,
        target,
        isSubtask: !!subtask,
        workingTimeStr: formatWorkingTime(workingTimeMs),
        pausedAtStr,
      });
      setIsOpen(true);
    }
  }, [tasks, currentUserId]);

  // 2. Listen for manual "In Progress" block custom window event
  useEffect(() => {
    const handleManualBlock = (event) => {
      const { workingTimeMs, pausedAtHour } = event.detail;
      const workingTimeStr = formatWorkingTime(workingTimeMs);
      const pausedAtStr = formatPausedAt(pausedAtHour);

      setPopupData({
        isManualBlock: true,
        workingTimeStr,
        pausedAtStr,
      });
      setIsOpen(true);
    };

    window.addEventListener("show-office-hours-ended-popup", handleManualBlock);
    return () => window.removeEventListener("show-office-hours-ended-popup", handleManualBlock);
  }, []);

  const handleClose = async () => {
    setIsOpen(false);
    if (!popupData || popupData.isManualBlock) {
      setPopupData(null);
      return;
    }

    const { task, target, isSubtask } = popupData;
    setPopupData(null);

    // Call API to set autoPaused: false on backend so the popup is not shown again
    try {
      if (isSubtask) {
        const updatedSubtasks = task.subtasks.map((sub) => {
          if (sub._id === target._id) {
            return { ...sub, autoPaused: false };
          }
          return sub;
        });
        await updateTask({
          id: task._id,
          taskData: { subtasks: updatedSubtasks },
        }).unwrap();
      } else {
        await updateTask({
          id: task._id,
          taskData: { autoPaused: false },
        }).unwrap();
      }
    } catch (err) {
      console.error("Failed to dismiss auto-paused popup flag:", err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && popupData && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-sm bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden"
          >
            {/* Decorative top strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
            
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
                <FiClock size={32} className="animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-2">
                ⏰ Office Hours Ended
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed font-semibold">
                Your work has been paused automatically because business hours have ended.
              </p>
            </div>

            {/* Time Grid Info */}
            <div className="grid grid-cols-2 gap-4 py-4 px-2 my-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <div className="space-y-1 text-center border-r border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Working Time
                </span>
                <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {popupData.workingTimeStr}
                </span>
              </div>
              <div className="space-y-1 text-center">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Paused At
                </span>
                <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {popupData.pausedAtStr}
                </span>
              </div>
            </div>

            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 max-w-[280px] mx-auto leading-relaxed">
              Tomorrow you can continue <br />
              from where you stopped.
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 px-5 rounded-2xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OfficeHoursPausedPopup;
