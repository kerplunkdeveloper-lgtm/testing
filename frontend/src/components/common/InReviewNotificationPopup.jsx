import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useGetTasksQuery } from "../../features/api/apiSlice";
import { format, parseISO, isToday, isTomorrow, isBefore, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiAlertCircle } from "react-icons/fi";

const InReviewNotificationPopup = () => {
  const { user } = useSelector((state) => state.auth);
  const { users = [] } = useSelector((state) => state.users || {});

  // Check if current user is authorized (Admin, Operation Manager, or Social Media Manager)
  const isAuthorized = useMemo(() => {
    if (!user) return false;
    const role = user.role?.toLowerCase() || "";
    const dept = user.department?.toLowerCase() || "";
    return (
      role === "admin" ||
      role === "operationmanager" ||
      dept === "social media manager"
    );
  }, [user]);

  const { data: allTasks = [] } = useGetTasksQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds to keep fresh
    skip: !isAuthorized,
  });

  const [isOpen, setIsOpen] = useState(false);

  // Synthesize a clean, premium double-tone chime sound programmatically
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Tone 1: 830Hz (Sine wave, warm tone)
      const osc1 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(830, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      
      osc1.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.6);
      
      // Tone 2: 1100Hz (Harmonic tone, slightly delayed by 80ms)
      setTimeout(() => {
        try {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(1100, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.5);
        } catch (e) {}
      }, 80);
    } catch (e) {
      console.log("Audio playback blocked or unsupported by browser:", e);
    }
  };

  const currentUserId = user?._id || user?.id;

  // Filter tasks that are in review or revision (All for Admin/OpManager, createdBy only for Social Media Manager)
  const inReviewTasks = useMemo(() => {
    if (!isAuthorized || !currentUserId) return [];
    const filtered = allTasks.filter((task) => {
      const s = task.status?.toLowerCase() || "";
      const isReview = s.includes("review") || s.includes("revision");
      if (!isReview) return false;

      const role = user?.role?.toLowerCase() || "";
      if (role === "admin" || role === "operationmanager") {
        return true;
      }

      const creatorId = task.createdBy && typeof task.createdBy === "object"
        ? task.createdBy._id || task.createdBy.id
        : task.createdBy;
      return creatorId === currentUserId;
    });

    // Sort by createdAt ascending (oldest task created first - First in, First out)
    return [...filtered].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateA - dateB;
    });
  }, [allTasks, isAuthorized, currentUserId, user]);

  useEffect(() => {
    if (!isAuthorized || inReviewTasks.length === 0) {
      setIsOpen(false);
      return;
    }

    // Set 5-minute periodic interval for all authorized users (Admin, OpManager, Social Media Manager)
    // To prevent showing the popup immediately on page load/refresh, we only check on interval ticks.
    const interval = setInterval(() => {
      if (inReviewTasks.length > 0) {
        setIsOpen(true);
        playBeep();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthorized, inReviewTasks.length]);

  if (!isAuthorized || inReviewTasks.length === 0) return null;

  return (
    <>
      {/* Floating Action Button (bottom right message icon) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 pointer-events-auto border border-amber-400/20"
            title={`${inReviewTasks.length} tasks in review`}
          >
            <div className="relative">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {/* Notification count badge */}
              <span className="absolute -top-3.5 -right-3.5 min-w-[1.25rem] h-[1.25rem] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                {inReviewTasks.length}
              </span>
              {/* Pulsing ring */}
              <span className="absolute -top-3.5 -right-3.5 w-[1.25rem] h-[1.25rem] rounded-full bg-red-500 animate-ping opacity-65 pointer-events-none" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Popup Details Card */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-0 sm:bottom-6 left-0 sm:left-auto right-0 sm:right-6 md:right-8 z-[9999] w-full sm:max-w-md p-4 sm:p-1.5 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border border-slate-200 dark:border-slate-850 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-5 pointer-events-auto relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg animate-pulse">
                    <FiAlertCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">
                      Tasks In Review
                    </h4>
                    <p className="text-[9px] sm:text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {inReviewTasks.length} {inReviewTasks.length === 1 ? "task" : "tasks"} pending approval
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>

              {/* Task List Container */}
              <div className="space-y-2.5 max-h-[200px] sm:max-h-[250px] overflow-y-auto pr-1.5 custom-scrollbar">
                {inReviewTasks.map((task) => {
                  const assigneeName =
                    typeof task.assignedTo === "object"
                      ? task.assignedTo?.name
                      : "Unassigned";
                  const assigneeImg =
                    task.assignedTo?.profile?.profileImage?.url ||
                    task.assignedTo?.profileImage?.url ||
                    task.assignedTo?.profilePic ||
                    null;

                  const creatorObj = task.createdBy && typeof task.createdBy === "object"
                    ? task.createdBy
                    : users?.find((u) => u._id === task.createdBy);
                  const creatorName = creatorObj?.name || "Unknown";
                  const creatorImg =
                    creatorObj?.profile?.profileImage?.url ||
                    creatorObj?.profileImage?.url ||
                    creatorObj?.profilePic ||
                    null;

                  const isTodayDue = task.dueDate ? isToday(parseISO(task.dueDate)) : false;
                  const isTomorrowDue = task.dueDate ? isTomorrow(parseISO(task.dueDate)) : false;
                  const isOverdue = task.dueDate
                    ? isBefore(parseISO(task.dueDate), startOfDay(new Date())) && !isTodayDue
                    : false;

                  let formattedDueDate = "No Due Date";
                  if (task.dueDate) {
                    if (isTodayDue) {
                      formattedDueDate = "Today";
                    } else if (isTomorrowDue) {
                      formattedDueDate = "Tomorrow";
                    } else {
                      formattedDueDate = format(parseISO(task.dueDate), "MMM dd, yyyy");
                    }
                  }

                  const getInitials = (name) => {
                    if (!name) return "";
                    return name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  };

                  return (
                    <div
                      key={task._id}
                      className="p-3 bg-slate-50/50 dark:bg-slate-955/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex flex-col gap-2 hover:border-amber-300 dark:hover:border-amber-500/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug break-words">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-200/50 dark:border-yellow-500/20">
                            {task.status}
                          </span>
                          <span className="text-[10px] text-slate-350 dark:text-slate-700">•</span>
                          <span className={`text-[10px] font-bold ${
                            isTodayDue || isOverdue
                              ? "text-red-500 dark:text-red-400 animate-pulse font-black"
                              : isTomorrowDue
                              ? "text-amber-500 dark:text-amber-400 font-black"
                              : "text-slate-500 dark:text-slate-400"
                          }`}>
                            Due: {formattedDueDate}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col xs:flex-row xs:items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2 gap-2 mt-0.5">
                        {/* Creator */}
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">By:</span>
                          <div className="flex items-center gap-1">
                            {creatorImg ? (
                              <img
                                src={creatorImg}
                                alt={creatorName}
                                className="w-4 h-4 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-[7px] font-black ring-1 ring-slate-250">
                                {getInitials(creatorName)}
                              </div>
                            )}
                            <span className="text-[10px] text-slate-600 dark:text-slate-350 font-semibold truncate max-w-[80px]" title={creatorName}>
                              {creatorName}
                            </span>
                          </div>
                        </div>

                        {/* Assignee */}
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">To:</span>
                          <div className="flex items-center gap-1">
                            {assigneeImg ? (
                              <img
                                src={assigneeImg}
                                alt={assigneeName}
                                className="w-4 h-4 rounded-full object-cover ring-1 ring-indigo-400/30"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-[7px] font-black ring-1 ring-indigo-400/20">
                                {getInitials(assigneeName)}
                              </div>
                            )}
                            <span className="text-[10px] text-slate-600 dark:text-slate-350 font-semibold truncate max-w-[80px]" title={assigneeName}>
                              {assigneeName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-[10px] font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InReviewNotificationPopup;
