import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft,
  FiX,
  FiPlus,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiCalendar,
  FiTrash2,
  FiCornerDownRight,
  FiBriefcase,
  FiTag,
  FiClock,
  FiList,
  FiGrid,
  FiPieChart,
  FiMoreHorizontal,
  FiEdit2,
  FiPaperclip,
  FiSend,
  FiFile,
  FiCheckCircle,
  FiAlertTriangle,
  FiLayers,
  FiSliders,
  FiSearch,
  FiActivity,
  FiFileText,
  FiMoreVertical,
  FiEye,
  FiEyeOff,
  FiColumns,
  FiFilter,
  FiLoader,
  FiLock,
} from "react-icons/fi";
import { getTotalTrackedMs, formatShortDuration, getStatusTrackedMs, getTodayProductivityMs } from "../../utils/taskTimerUtils";
import axiosInstance from "../../services/axiosInstance";
import toast from "react-hot-toast";

import {
  apiSlice,
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "../../features/api/apiSlice";
import { updateProject } from "../../features/projects/projectSlice";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import ProjectIcon from "../../components/common/ProjectIcon";
import CorrectionModal from "../../components/CorrectionModal";
import ClientBadge, {
  getClientBranding,
} from "../../components/common/ClientBadge";
import { getClientIconComponent } from "../../utils/clientHelpers";
import { calculateBusinessMs } from "../../utils/businessHours";

const formatBusinessDuration = (ms) => {
  if (!ms) return "0m 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

const getStatusWithEmoji = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "pending" || s === "to do") return "Not Started";
  if (s.includes("progress")) return "In Progress";
  if (s.includes("review")) return "In Review";
  if (s.includes("correction")) return "Correction";
  if (s === "completed" || s.includes("approve") || s === "done")
    return "Completed";
  if (s.includes("hold")) return "On Hold";
  if (s.includes("reject")) return "Rejected";
  return status || "Not Started";
};

const isSameDate = (d1, d2) => {
  if (!d1 || !d2) return false;
  try {
    const s1 =
      typeof d1 === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d1.trim())
        ? d1.trim()
        : new Date(d1).toISOString().split("T")[0];
    const s2 =
      typeof d2 === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d2.trim())
        ? d2.trim()
        : new Date(d2).toISOString().split("T")[0];
    return s1 === s2 && s1 !== "1970-01-01";
  } catch (e) {
    return false;
  }
};

const ApprovalTimeDisplay = React.memo(
  ({
    reviewStartedAt,
    completedAt,
    approvalWaitingMs,
    status,
    lastReviewStartedAt,
    reviewCycles,
  }) => {
    const [liveElapsed, setLiveElapsed] = useState(0);
    const [showPopup, setShowPopup] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const popupRef = useRef(null);

    useEffect(() => {
      if (!reviewStartedAt || status !== "In Review") {
        setLiveElapsed(0);
        return;
      }
      const updateTime = () => {
        const elapsed = calculateBusinessMs(reviewStartedAt, Date.now());
        setLiveElapsed(elapsed);
      };
      updateTime();
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }, [reviewStartedAt, status]);

    // Click outside close
    useEffect(() => {
      if (!showPopup) return;
      const handleClickOutside = (e) => {
        if (
          popupRef.current &&
          !popupRef.current.contains(e.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(e.target)
        ) {
          setShowPopup(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [showPopup]);

    const effectiveReviewStart =
      reviewStartedAt ||
      lastReviewStartedAt ||
      (reviewCycles && reviewCycles.length > 0
        ? reviewCycles[reviewCycles.length - 1]?.startedAt
        : null);

    if (!effectiveReviewStart && !approvalWaitingMs) {
      return (
        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
      );
    }

    const formatDateTime = (dateStr) => {
      if (!dateStr) return { date: "—", time: "", relative: "" };
      const d = new Date(dateStr);
      const date = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });
      const time = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const diffMs = Date.now() - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      let relative = "just now";
      if (diffDays > 0) relative = `${diffDays}d ago`;
      else if (diffHours > 0) relative = `${diffHours}h ago`;
      else if (diffMins > 0) relative = `${diffMins}m ago`;
      return { date, time, relative };
    };

    const totalWaitMs = (approvalWaitingMs || 0) + liveElapsed;
    const isInReview = status === "In Review";
    const revInfo = effectiveReviewStart
      ? formatDateTime(effectiveReviewStart)
      : null;
    const doneInfo = completedAt ? formatDateTime(completedAt) : null;

    const handleToggle = (e) => {
      e.stopPropagation();
      if (!showPopup && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        // Position above the button, aligned to its right edge
        setCoords({
          top: rect.top + window.scrollY - 175,
          left: rect.right + window.scrollX - 224,
        });
      }
      setShowPopup(!showPopup);
    };

    return (
      <div className="relative inline-flex items-center gap-1.5 justify-center">
        {/* Duration badge */}
        {totalWaitMs > 0 && (
          <div
            className={`px-2.5 py-1 rounded-full font-black text-[10px] tracking-wide border shadow-sm ${
              isInReview
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25"
                : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20"
            }`}
          >
            {isInReview && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0 mr-1 inline-block" />
            )}
            {isInReview ? "Waiting " : "Took "}
            <span className="font-black">
              {formatBusinessDuration(totalWaitMs)}
            </span>
          </div>
        )}

        {/* View Details Eye Icon */}
        {(revInfo || doneInfo) && (
          <button
            ref={buttonRef}
            type="button"
            onClick={handleToggle}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-[#3b82f6] transition-colors cursor-pointer"
            title="View approval details"
          >
            <FiEye size={13} />
          </button>
        )}

        {/* Details Popup rendered via Portal */}
        {showPopup &&
          createPortal(
            <AnimatePresence>
              <motion.div
                ref={popupRef}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: coords.top,
                  left: coords.left,
                }}
                className="z-[9999] w-56 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex flex-col gap-2 text-left"
              >
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Timeline Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPopup(false)}
                    className="text-slate-400 hover:text-slate-600 dark:text-[#555] dark:hover:text-slate-350 cursor-pointer"
                  >
                    <FiX size={10} />
                  </button>
                </div>

                {revInfo && (
                  <div className="flex flex-col gap-0.5 bg-blue-50/40 dark:bg-blue-950/20 p-2 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                    <span className="text-[8px] font-black text-blue-500 dark:text-blue-450 uppercase tracking-widest">
                      Review Start
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">
                      {revInfo.date} · {revInfo.time}
                    </span>
                    <span className="text-[9px] text-blue-450 dark:text-blue-500 font-medium">
                      {revInfo.relative}
                    </span>
                  </div>
                )}

                {doneInfo && (
                  <div className="flex flex-col gap-0.5 bg-emerald-50/40 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30">
                    <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-450 uppercase tracking-widest">
                      Completed
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px]">
                      {doneInfo.date} · {doneInfo.time}
                    </span>
                    <span className="text-[9px] text-emerald-400 dark:text-emerald-500 font-medium">
                      {doneInfo.relative}
                    </span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>,
            document.body,
          )}
      </div>
    );
  },
);

const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};

const TimeTracker = React.memo(
  ({
    task,
    startTime,
    endTime,
    pausedAt,
    autoPaused,
    status,
    savedPausedMs = 0,
    totalTrackedTime = 0,
    variant = "default",
  }) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
      if (status === "In Progress" && !autoPaused && !endTime) {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
      }
    }, [status, autoPaused, endTime]);

    const taskObj = task || {
      status,
      actualStartTime: startTime,
      actualEndTime: endTime,
      pausedAt,
      autoPaused,
      totalPausedMs: savedPausedMs,
      totalTrackedTime,
      statusHistory: [],
    };

    const productiveMs = getStatusTrackedMs(taskObj, "In Progress", new Date(now));
    const holdMs = getStatusTrackedMs(taskObj, "On Hold", new Date(now));
    const correctionMs = getStatusTrackedMs(taskObj, "Correction", new Date(now));
    const todayMs = getTodayProductivityMs(taskObj, new Date(now));

    if (status === "Not Started" || (!startTime && productiveMs === 0 && holdMs === 0 && correctionMs === 0)) {
      return (
        <span className="text-slate-405 dark:text-slate-500 font-semibold text-xs block text-center w-full">
          Not started
        </span>
      );
    }

    return (
      <div className="flex flex-col gap-1 w-full p-1 rounded-md bg-white dark:bg-[#1e1e24] shadow-sm border border-slate-200 dark:border-slate-700/50">
        {todayMs > 0 && (
          <div className="flex justify-between items-center px-1.5 pb-1 border-b border-slate-100 dark:border-white/5">
            <span className="text-[10px] text-slate-800 dark:text-slate-200 font-bold">Today</span>
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatShortDuration(todayMs)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center px-1.5">
          <span className="text-[10px] text-slate-500 font-semibold">Productive</span>
          <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
             {formatShortDuration(productiveMs)}
          </span>
        </div>
        {holdMs > 0 && (
          <div className="flex justify-between items-center px-1.5">
            <span className="text-[10px] text-slate-500 font-semibold">Hold</span>
            <span className="font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-500">
              {formatShortDuration(holdMs)}
            </span>
          </div>
        )}
        {correctionMs > 0 && (
          <div className="flex justify-between items-center px-1.5">
            <span className="text-[10px] text-slate-500 font-semibold">Correction</span>
            <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-500">
              {formatShortDuration(correctionMs)}
            </span>
          </div>
        )}
      </div>
    );
  }
);

// Task Title Input Component for autosaving inline without cursor jump
const TaskTitleInput = ({
  task,
  canToggle,
  handleTaskFieldChange,
  isCompleted,
  onEnter,
}) => {
  const [title, setTitle] = useState(task.title);

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  return (
    <input
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        if (title.trim() && title !== task.title) {
          handleTaskFieldChange(task._id, { title: title.trim() });
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (title.trim() && title !== task.title) {
            handleTaskFieldChange(task._id, { title: title.trim() });
          }
          if (onEnter) {
            onEnter();
          }
          e.target.blur();
        }
      }}
      placeholder="Write a task here..."
      className={`bg-transparent  outline-none w-full p-0 font-semibold text-slate-800 dark:text-white px-0 py-0 text-[11px] ${
        isCompleted ? "line-through text-slate-450 dark:text-slate-500" : ""
      }`}
      disabled={!canToggle}
    />
  );
};

// Content Type Input Component for inline editing in the table
const ContentTypeInput = ({
  value,
  onChange,
  placeholder = "Enter type...",
}) => {
  const [val, setVal] = useState(value);

  useEffect(() => {
    setVal(value);
  }, [value]);

  return (
    <input
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        if (val !== value) {
          onChange(val);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (val !== value) {
            onChange(val);
          }
          e.target.blur();
        }
      }}
      placeholder={placeholder}
      className="bg-transparent border border-slate-200 dark:border-white/10 rounded px-2 py-0.5 outline-none text-slate-800 dark:text-white w-full max-w-[120px] text-[11px] font-semibold text-center focus:border-blue-500 dark:focus:border-[#3b82f6]"
    />
  );
};

// Subtask Row Component for the Drawer subtasks list
const SubtaskRow = ({
  sub,
  task,
  users,
  getAvatarColor,
  handleSubtaskFieldChange,
  handleDeleteSubtask,
  isAdminOrManager,
  currentUser,
  subIdx,
  handleSubtaskEnterKey,
  shouldAutoFocus,
  onAutoFocused,
}) => {
  const isSubCompleted = sub.status === "Completed";
  const canToggleSub =
    isAdminOrManager ||
    sub.assignedTo?._id === currentUser?._id ||
    sub.assignedTo === currentUser?._id;
  const [subTitle, setSubTitle] = useState(sub.title);

  useEffect(() => {
    setSubTitle(sub.title);
  }, [sub.title]);

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-white hover:bg-slate-50/80 dark:bg-transparent dark:hover:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 transition-all group relative">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Circular Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canToggleSub) {
              handleSubtaskFieldChange(task, sub._id, {
                status: isSubCompleted ? "Not Started" : "Completed",
              });
            }
          }}
          disabled={!canToggleSub}
          className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
            !canToggleSub ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          } ${
            isSubCompleted
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-[#3b82f6] text-transparent hover:text-slate-400 dark:hover:text-[#3b82f6]"
          }`}
        >
          <FiCheck size={9} />
        </button>

        {/* Subtask Title Input */}
        <input
          ref={(el) => {
            if (shouldAutoFocus && el) {
              el.focus();
              el.select();
              onAutoFocused();
            }
          }}
          type="text"
          value={subTitle}
          onChange={(e) => setSubTitle(e.target.value)}
          onBlur={() => {
            const trimmed = subTitle.trim();
            if (trimmed !== sub.title) {
              handleSubtaskFieldChange(task, sub._id, {
                title: trimmed,
              });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (handleSubtaskEnterKey) {
                handleSubtaskEnterKey(task, subIdx, subTitle, true);
              } else {
                e.target.blur();
              }
            }
          }}
          placeholder="Write a subtask..."
          className={`bg-transparent border-0 focus:outline-none focus:ring-0 w-full p-0 font-bold rounded text-[12px] placeholder-slate-400 dark:placeholder-slate-600 transition-all ${
            isSubCompleted
              ? "line-through text-slate-400 dark:text-slate-500 font-normal"
              : "text-slate-800 dark:text-slate-200"
          }`}
          disabled={!canToggleSub}
        />
      </div>

      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Start Date Picker */}
        <div
          className="relative h-6 flex items-center justify-center transition-all cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            const input = e.currentTarget.querySelector('input[type="date"]');
            if (input && typeof input.showPicker === "function") {
              input.showPicker();
            }
          }}
        >
          {sub.startDate ? (
            <div className="flex items-center flex-nowrap gap-1 px-1.5 py-2 rounded-md border border-blue-200 dark:border-blue-900/60 hover:border-blue-350 dark:hover:border-blue-500/40 text-blue-700 dark:text-blue-300 text-[9px] font-semibold bg-blue-50 dark:bg-blue-950/30 transition-all">
              <FiCalendar
                size={8}
                className="text-blue-500 dark:text-blue-400 mr-1 shrink-0"
              />
              <span className="whitespace-nowrap">
                S:{" "}
                {new Date(sub.startDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {isAdminOrManager && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubtaskFieldChange(task, sub._id, {
                      startDate: null,
                    });
                  }}
                  className="ml-1 text-blue-400 hover:text-rose-500 transition-colors cursor-pointer relative z-10"
                >
                  <FiX size={10} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-2 rounded-md border border-dashed border-blue-200 dark:border-blue-900/40 text-blue-500/70 dark:text-blue-500/50 hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-400 dark:hover:border-blue-500/40 bg-blue-50/20 dark:bg-blue-950/10 transition-all text-[9px] font-bold">
              <FiCalendar size={9} />
              <span>+ Start</span>
            </div>
          )}
          {isAdminOrManager && (
            <input
              type="date"
              value={
                sub.startDate
                  ? new Date(sub.startDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                handleSubtaskFieldChange(task, sub._id, {
                  startDate: e.target.value || null,
                })
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          )}
        </div>

        {/* End Date Picker */}
        <div
          className="relative h-6 flex items-center justify-center transition-all cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            const input = e.currentTarget.querySelector('input[type="date"]');
            if (input && typeof input.showPicker === "function") {
              input.showPicker();
            }
          }}
        >
          {sub.dueDate ? (
            <div className="flex items-center flex-nowrap gap-1 px-1.5 py-2 rounded-md border border-rose-200 dark:border-rose-900/60 hover:border-rose-350 dark:hover:border-rose-500/40 text-rose-700 dark:text-rose-305 text-[9px] font-semibold bg-rose-50 dark:bg-rose-950/30 transition-all">
              <FiCalendar
                size={8}
                className="text-rose-555 dark:text-rose-400 mr-1 shrink-0"
              />
              <span className="whitespace-nowrap">
                E:{" "}
                {new Date(sub.dueDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {isAdminOrManager && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubtaskFieldChange(task, sub._id, { dueDate: null });
                  }}
                  className="ml-1 text-rose-400 hover:text-rose-550 transition-colors cursor-pointer relative z-10"
                >
                  <FiX size={10} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-2 rounded-md border border-dashed border-rose-200 dark:border-rose-900/40 text-rose-500/70 dark:text-rose-500/50 hover:border-rose-400 hover:text-rose-700 dark:hover:text-rose-400 dark:hover:border-rose-500/40 bg-rose-50/20 dark:bg-rose-955/10 transition-all text-[9px] font-bold">
              <FiCalendar size={9} />
              <span>+ End</span>
            </div>
          )}
          {isAdminOrManager && (
            <input
              type="date"
              value={
                sub.dueDate
                  ? new Date(sub.dueDate).toISOString().split("T")[0]
                  : ""
              }
              min={
                sub.startDate
                  ? new Date(sub.startDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                handleSubtaskFieldChange(task, sub._id, {
                  dueDate: e.target.value || null,
                })
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          )}
        </div>

        {/* Assignee Picker (Always Visible) */}
        <div className="flex items-center gap-1.5">
          <AssigneeDropdown
            selectedUser={
              sub.contentType === "MOM"
                ? sub.assignedTo ||
                  sub.createdBy?._id ||
                  sub.createdBy?.id ||
                  sub.createdBy ||
                  task.createdBy?._id ||
                  task.createdBy?.id ||
                  task.createdBy ||
                  currentUser?._id ||
                  currentUser?.id
                : sub.assignedTo
            }
            users={users}
            onChange={(userId) =>
              handleSubtaskFieldChange(task, sub._id, {
                assignedTo: userId,
              })
            }
            isAdminOrManager={isAdminOrManager}
            disabled={sub.contentType === "MOM"}
            isLocked={sub.contentType === "MOM"}
            isMOM={sub.contentType === "MOM"}
            getAvatarColor={getAvatarColor}
            size="sm"
          />
          {sub.assignedTo && isAdminOrManager && sub.contentType !== "MOM" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSubtaskFieldChange(task, sub._id, { assignedTo: null });
              }}
              className="p-0.5 text-slate-400 hover:text-rose-500 rounded transition-colors hover:bg-slate-200 dark:hover:bg-white/10 shrink-0 relative z-10"
              title="Clear Assignee"
            >
              <FiX size={10} />
            </button>
          )}
        </div>

        {/* Delete Button (Always Visible) */}
        {isAdminOrManager && (
          <button
            onClick={() => handleDeleteSubtask(task, sub._id)}
            className="w-6 h-6 rounded-full border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-200 dark:hover:border-rose-900/50 bg-white dark:bg-[#111111] transition-all cursor-pointer"
            title="Delete Subtask"
          >
            <FiTrash2 size={11} />
          </button>
        )}

        {/* Right Chevron (Always Visible) */}
        <div className="text-slate-300 dark:text-slate-600 pl-0.5">
          <FiChevronRight size={14} />
        </div>
      </div>
    </div>
  );
};

const AssigneeDropdown = ({
  selectedUser,
  users = [],
  onChange,
  isAdminOrManager,
  getAvatarColor,
  align = "left",
  size = "md",
  disabled = false,
  isLocked = false,
  isMOM = false,
  currentUser = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [coords, setCoords] = useState({
    top: 0,
    bottom: null,
    left: 0,
    width: 0,
    isUpward: false,
  });
  const dropdownRef = useRef(null);

  const canEdit = isAdminOrManager && !disabled && !isLocked && !isMOM;

  const updateCoords = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56 is 14rem = 224px
      const dropdownHeight = 244; // estimated max height of dropdown

      // Check if left alignment would go off-screen
      let left = rect.left;
      if (rect.left + dropdownWidth > window.innerWidth) {
        // Right align instead: align right edge of dropdown with right edge of trigger
        left = Math.max(10, rect.right - dropdownWidth);
      }

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const isUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setCoords({
        top: isUpward ? null : rect.bottom,
        bottom: isUpward ? window.innerHeight - rect.top : null,
        left: left,
        width: rect.width,
        isUpward: isUpward,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !e.target.closest(".assignee-dropdown-portal")
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  let selectedUserObj =
    typeof selectedUser === "string"
      ? (users || []).find(
          (u) => u && (u._id === selectedUser || u.id === selectedUser),
        )
      : selectedUser;
  if (
    !selectedUserObj &&
    selectedUser &&
    currentUser &&
    (selectedUser === currentUser._id || selectedUser === currentUser.id)
  ) {
    selectedUserObj = currentUser;
  }
  if (!selectedUserObj && isMOM && currentUser) {
    selectedUserObj = currentUser;
  }

  const handleSelect = (user) => {
    onChange(user ? user._id : null);
    setIsOpen(false);
  };

  const safeGetAvatarColor = (name) => {
    if (typeof getAvatarColor === "function") {
      return getAvatarColor(name);
    }
    const colors = [
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-purple-500 to-pink-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-red-600",
    ];
    if (!name) return colors[0];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "U";
    return (
      name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  const getAvatarUrl = (userObj) => {
    return (
      userObj?.profile?.profileImage?.url ||
      userObj?.profileImage?.url ||
      userObj?.profile?.avatar ||
      userObj?.avatar ||
      ""
    );
  };

  const getDepartment = (userObj) => {
    return (
      userObj?.department || userObj?.profile?.department || userObj?.role || ""
    );
  };

  const renderTrigger = () => {
    const avatarUrl = getAvatarUrl(selectedUserObj);
    const dept = getDepartment(selectedUserObj);

    if (size === "sm") {
      return (
        <div
          onClick={() => canEdit && setIsOpen(!isOpen)}
          className={`relative w-6 h-6 rounded-full border border-dashed border-slate-300 dark:border-indigo-900 flex items-center justify-center text-slate-400 dark:text-indigo-400/75 bg-white dark:bg-[#111111] transition-all ${
            canEdit
              ? "cursor-pointer hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-[#3b82f6] dark:hover:border-[#3b82f6]/40"
              : "cursor-default"
          } overflow-hidden`}
        >
          {selectedUserObj ? (
            avatarUrl ? (
              <img
                src={avatarUrl}
                alt={selectedUserObj?.name || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-white text-[8px] font-bold bg-gradient-to-br ${safeGetAvatarColor(
                  selectedUserObj?.name || "U",
                )}`}
              >
                {getInitials(selectedUserObj?.name)}
              </div>
            )
          ) : (
            <FiUser size={11} />
          )}
        </div>
      );
    }

    if (size === "lg") {
      return (
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 ${
            canEdit
              ? "cursor-pointer hover:border-slate-350 dark:hover:border-white/20"
              : "cursor-default opacity-95"
          } focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#3b82f6]`}
        >
          <div className="flex items-center gap-2 truncate">
            {selectedUserObj ? (
              <>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={selectedUserObj?.name || "User"}
                    className="w-5 h-5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-gradient-to-br shrink-0 ${safeGetAvatarColor(
                      selectedUserObj?.name || "U",
                    )}`}
                  >
                    {getInitials(selectedUserObj?.name)}
                  </div>
                )}
                <span className="truncate">
                  {selectedUserObj?.name || "Assigned User"}{" "}
                  {dept && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-550 font-normal">
                      ({dept})
                    </span>
                  )}
                </span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">
                Unassigned
              </span>
            )}
          </div>
          {canEdit && (
            <FiChevronDown
              size={14}
              className="text-slate-400 dark:text-slate-500 shrink-0"
            />
          )}
        </button>
      );
    }

    if (selectedUserObj) {
      return (
        <div
          onClick={() => canEdit && setIsOpen(!isOpen)}
          className={`group/assigned relative flex items-center gap-1.5 bg-slate-50/40 dark:bg-white/5 px-1.5 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/10 transition-all ${
            canEdit
              ? "cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/10"
              : "cursor-default"
          } w-[135px] h-[28px] shadow-sm`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={selectedUserObj?.name || "User"}
              className="w-5.5 h-5.5 rounded-full object-cover border border-slate-250 dark:border-white/10 shrink-0"
            />
          ) : (
            <div
              className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-white font-black text-[9px] bg-gradient-to-br shrink-0 ${safeGetAvatarColor(
                selectedUserObj?.name || "Unknown",
              )}`}
            >
              {getInitials(selectedUserObj?.name)}
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col text-left">
            <span className="text-[9.5px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
              {selectedUserObj?.name || "Assigned"}
            </span>
            {dept && (
              <span className="text-[8px] font-medium text-slate-500 dark:text-slate-400 truncate leading-none mt-0">
                {dept}
              </span>
            )}
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
              }}
              className="relative z-20 p-0.5 text-slate-400 hover:text-rose-500 rounded transition-colors hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0 cursor-pointer"
              title="Clear Assignee"
            >
              <FiX size={9.5} />
            </button>
          )}
        </div>
      );
    }

    return (
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => setIsOpen(!isOpen)}
        className={`group/assign relative flex items-center gap-1.5 bg-slate-50/20 dark:bg-white/5 hover:bg-slate-100/40 dark:hover:bg-white/10 px-1.5 py-0.5 rounded-lg border border-dashed border-slate-300 dark:border-white/10 transition-all ${
          canEdit
            ? "cursor-pointer hover:bg-slate-100/40 dark:hover:bg-white/10"
            : "cursor-default"
        } w-[135px] h-[28px] text-left`}
      >
        <div className="w-5.5 h-5.5 rounded-full border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 bg-white dark:bg-[#111111]">
          <FiUser
            size={10}
            className={canEdit ? "group-hover/assign:hidden" : ""}
          />
          {canEdit && (
            <FiPlus
              size={10}
              className="hidden group-hover/assign:block text-blue-500 dark:text-[#3b82f6]"
            />
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col text-left">
          <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-550 truncate leading-tight">
            Unassigned
          </span>
          <span className="text-[8px] font-medium text-slate-400/80 dark:text-slate-550/80 truncate leading-none mt-0">
            Assign Task
          </span>
        </div>
      </button>
    );
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left w-full">
      {renderTrigger()}

      {isOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: coords.isUpward ? "auto" : `${coords.top}px`,
              bottom: coords.isUpward ? `${coords.bottom}px` : "auto",
              left: `${coords.left}px`,
              zIndex: 999999,
            }}
            className={`assignee-dropdown-portal w-56 rounded-xl bg-white dark:bg-[#151518] border border-slate-200 dark:border-white/10 shadow-2xl py-1.5 max-h-60 overflow-y-auto ${
              coords.isUpward ? "mb-1" : "mt-1"
            }`}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="px-2 pb-2 mb-1 border-b border-slate-100 dark:border-white/5">
              <input
                type="text"
                placeholder="Search assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#111111] text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-700 dark:text-white transition-colors"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5"
            >
              <div className="w-5 h-5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
                <FiX size={10} />
              </div>
              <span>Unassigned</span>
            </button>

            {(users || [])
              .filter(
                (u) =>
                  u &&
                  (!searchTerm ||
                    u.name?.toLowerCase().includes(searchTerm.toLowerCase())),
              )
              .map((u) => {
                const isSelected = selectedUserObj?._id === u._id;
                const uAvatar = getAvatarUrl(u);
                const uDept = getDepartment(u);
                return (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => handleSelect(u)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                      isSelected
                        ? "text-blue-600 dark:text-[#3b82f6] bg-blue-50/30 dark:bg-[#3b82f6]/5"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {uAvatar ? (
                        <img
                          src={uAvatar}
                          alt={u.name}
                          className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-100 dark:border-white/5"
                        />
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-gradient-to-br shrink-0 ${getAvatarColor(
                            u.name || "U",
                          )}`}
                        >
                          {getInitials(u.name)}
                        </div>
                      )}
                      <div className="flex flex-col truncate">
                        <span className="truncate">{u.name}</span>
                        {uDept && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-550 font-normal truncate">
                            {uDept}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <FiCheck
                        size={12}
                        className="text-blue-600 dark:text-[#3b82f6] shrink-0"
                      />
                    )}
                  </button>
                );
              })}
          </div>,
          document.body,
        )}
    </div>
  );
};

const ClientDropdown = ({
  selectedClient,
  clients = [],
  onChange,
  isAdminOrManager,
  align = "left",
  size = "md",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [coords, setCoords] = useState({
    top: 0,
    bottom: null,
    left: 0,
    width: 0,
    isUpward: false,
  });
  const dropdownRef = useRef(null);

  const updateCoords = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56 is 14rem = 224px
      const dropdownHeight = 244; // estimated max height of dropdown

      let left = rect.left;
      if (rect.left + dropdownWidth > window.innerWidth) {
        left = Math.max(10, rect.right - dropdownWidth);
      }

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const isUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setCoords({
        top: isUpward ? null : rect.bottom,
        bottom: isUpward ? window.innerHeight - rect.top : null,
        left: left,
        width: rect.width,
        isUpward: isUpward,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !e.target.closest(".client-dropdown-portal")
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const selectedClientObj =
    typeof selectedClient === "string"
      ? (clients || []).find((c) => c && c._id === selectedClient)
      : selectedClient;

  const handleSelect = (client) => {
    onChange(client ? client._id : null);
    setIsOpen(false);
  };

  const getClientInitials = (name) => {
    if (!name || typeof name !== "string") return "C";
    return (
      name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "C"
    ).substring(0, 2);
  };

  const getClientBadgeStyle = (companyName) => {
    const styles = [
      "text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/20 border-blue-100/60 dark:border-blue-900/30",
      "text-purple-600 dark:text-purple-400 bg-purple-50/70 dark:bg-purple-950/20 border-purple-100/60 dark:border-purple-900/30",
      "text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100/60 dark:border-emerald-500/20",
      "text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/20 border-rose-100/60 dark:border-rose-900/30",
      "text-amber-600 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/20 border-amber-100/60 dark:border-amber-900/30",
    ];
    if (!companyName) return styles[0];
    let hash = 0;
    for (let i = 0; i < companyName.length; i++) {
      hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % styles.length;
    return styles[index];
  };

  const renderTrigger = () => {
    if (selectedClientObj) {
      const branding = getClientBranding(selectedClientObj);
      const IconComponent = getClientIconComponent(branding.iconName);
      return (
        <div
          onClick={() => isAdminOrManager && setIsOpen(!isOpen)}
          className={`group/assigned relative flex items-center font-extrabold border shrink-0 px-2 py-0.5 text-[9px] gap-1 rounded-md transition-all ${
            isAdminOrManager
              ? "cursor-pointer hover:shadow-sm"
              : "cursor-not-allowed"
          } h-[24px] w-[110px]`}
          style={
            branding.hasCustomColor
              ? {
                  backgroundColor: `${branding.color}15`,
                  borderColor: `${branding.color}30`,
                  color: branding.color,
                }
              : {}
          }
        >
          <div className="flex items-center justify-center shrink-0">
            <IconComponent size={8.5} />
          </div>
          <span className="truncate flex-1 leading-tight">
            {selectedClientObj.companyName}
          </span>
        </div>
      );
    }

    return (
      <button
        type="button"
        disabled={!isAdminOrManager}
        onClick={() => setIsOpen(!isOpen)}
        className={`group/assign relative flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-700 transition-all ${
          isAdminOrManager
            ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            : "cursor-not-allowed"
        } h-[24px] w-[110px] text-left`}
      >
        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 truncate flex-1">
          Select Client
        </span>
        <FiChevronDown size={10} className="text-slate-400" />
      </button>
    );
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {renderTrigger()}

      {isOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: coords.isUpward ? "auto" : `${coords.top}px`,
              bottom: coords.isUpward ? `${coords.bottom}px` : "auto",
              left: `${coords.left}px`,
              zIndex: 999999,
            }}
            className={`client-dropdown-portal w-56 rounded-xl bg-white dark:bg-[#151518] border border-slate-200 dark:border-white/10 shadow-2xl py-1.5 max-h-60 overflow-y-auto ${
              coords.isUpward ? "mb-1" : "mt-1"
            }`}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="px-2 pb-2 mb-1 border-b border-slate-100 dark:border-white/5">
              <input
                type="text"
                placeholder="Search client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#111111] text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 outline-none focus:border-blue-500 text-slate-700 dark:text-white transition-colors"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5"
            >
              <div className="w-5 h-5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
                <FiX size={10} />
              </div>
              <span>None</span>
            </button>

            {(clients || [])
              .filter(
                (c) =>
                  c &&
                  (!searchTerm ||
                    c.companyName
                      ?.toLowerCase()
                      .includes(searchTerm.toLowerCase())),
              )
              .map((c) => {
                const isSelected = selectedClientObj?._id === c._id;
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                      isSelected
                        ? "text-blue-600 dark:text-[#3b82f6] bg-blue-50/30 dark:bg-[#3b82f6]/5"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {c.icon ? (
                        <img
                          src={c.icon}
                          alt=""
                          className="w-5 h-5 rounded object-contain bg-white shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold bg-slate-200 dark:bg-slate-800 shrink-0`}
                        >
                          {getClientInitials(c.companyName)}
                        </div>
                      )}
                      <span className="truncate">{c.companyName}</span>
                    </div>
                    {isSelected && (
                      <FiCheck
                        size={12}
                        className="text-blue-600 dark:text-[#3b82f6] shrink-0"
                      />
                    )}
                  </button>
                );
              })}
          </div>,
          document.body,
        )}
    </div>
  );
};

const ContentCopyInput = ({
  value,
  onChange,
  placeholder = "Content copy...",
}) => {
  const [val, setVal] = useState(value || "");

  useEffect(() => {
    setVal(value || "");
  }, [value]);

  return (
    <input
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        if (val !== (value || "")) {
          onChange(val);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (val !== (value || "")) {
            onChange(val);
          }
          e.target.blur();
        }
      }}
      placeholder={placeholder}
      className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 dark:focus:border-[#3b82f6] transition-all placeholder:font-normal hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-[#0f172a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.15)] text-left"
    />
  );
};

const RejectionModal = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  subtaskId,
  users = [],
}) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const target = subtaskId
    ? task?.subtasks?.find((s) => s._id === subtaskId)
    : task;
  const history = target?.rejectionHistory || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim())
      return toast.error("Please enter a reason for rejection");
    onSubmit(reason.trim());
    setReason("");
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#11131f] rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-rose-50/20 dark:bg-rose-950/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <FiAlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                Reject Task?
              </h3>
              <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-0.5">
                Confirm Action
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Are you sure you want to reject the following task? This action
              will set the task status to Rejected.
            </p>
            <div className="mt-3.5 px-3.5 py-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40">
              <p className="text-[10px] font-black text-rose-500 dark:text-rose-500 uppercase tracking-widest mb-1">
                Task Name
              </p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug break-words">
                {target?.title || "Untitled Task"}
              </p>
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please enter a professional reason explaining why this task is being rejected..."
                className="w-full bg-slate-50 dark:bg-[#181822] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 dark:focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 dark:focus:ring-rose-500/10 transition-all resize-none h-28"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <FiCheck size={14} />
                Reject Task
              </button>
            </div>
          </form>

          {/* History */}
          {history.length > 0 && (
            <div className="border-t border-slate-100 dark:border-white/5 pt-6">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <FiClock className="text-slate-400" />
                Previous Rejections ({history.length})
              </h4>
              <div className="flex flex-col gap-3">
                {history
                  .slice()
                  .reverse()
                  .map((item, idx) => {
                    const userObj = users?.find(
                      (u) =>
                        u._id === (item.rejectedBy?._id || item.rejectedBy),
                    );
                    const userName =
                      userObj?.name || item.rejectedBy?.name || "Unknown User";
                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl p-4"
                      >
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          "{item.reason}"
                        </p>
                        <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5">
                            <FiUser size={10} />
                            {userName}
                          </span>
                          <span>
                            {new Date(item.rejectedAt).toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

const ProjectTaskBoard = ({
  activeProjectId,
  activeProject,
  currentUser,
  users,
  clients,
  isAdminOrManager,
  getStatusBadge,
  getAvatarColor,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetHighlightTaskId = searchParams.get("taskId");
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);

  useEffect(() => {
    if (targetHighlightTaskId) {
      setHighlightedTaskId(targetHighlightTaskId);
      const timer1 = setTimeout(() => {
        const el = document.getElementById(`task-row-${targetHighlightTaskId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
      const timer2 = setTimeout(() => {
        setHighlightedTaskId(null);
      }, 2500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [targetHighlightTaskId]);

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  // Stable empty array to prevent infinite loops when data is undefined
  const EMPTY_TASKS = useRef([]).current;
  const { data: tasks = EMPTY_TASKS, isLoading: tasksLoading } =
    useGetTasksQuery();
  const [createTaskMutation] = useCreateTaskMutation();
  const [updateTaskMutation] = useUpdateTaskMutation();
  const [deleteTaskMutation] = useDeleteTaskMutation();

  // Local State

  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [checkedProjects, setCheckedProjects] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({}); // taskId -> boolean
  const [selectedTasks, setSelectedTasks] = useState({}); // taskId -> boolean
  const [selectionModeSections, setSelectionModeSections] = useState({}); // sectionName -> boolean
  const [editingDateTaskId, setEditingDateTaskId] = useState(null);
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [activeDateSelectionField, setActiveDateSelectionField] =
    useState("start"); // "start" | "due"

  // Rejection Modal State
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [taskToReject, setTaskToReject] = useState(null); // { taskId, subtaskId, previousStatus, taskObj }

  // Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [taskToCorrect, setTaskToCorrect] = useState(null); // { taskId, subtaskId, previousStatus, taskObj }

  // Helper to format date range beautifully (e.g. Jun 2 - 4)
  const formatDateRange = (startStr, endStr) => {
    if (!startStr && !endStr) return "";

    const options = { month: "short", day: "numeric" };

    if (startStr && !endStr) {
      const start = new Date(startStr);
      return start.toLocaleDateString(undefined, options);
    }

    if (!startStr && endStr) {
      const end = new Date(endStr);
      return end.toLocaleDateString(undefined, options);
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    const startMonth = start.toLocaleDateString(undefined, { month: "short" });
    const endMonth = end.toLocaleDateString(undefined, { month: "short" });

    const startDay = start.getDate();
    const endDay = end.getDate();

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    if (startYear !== endYear) {
      return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
    }

    if (startMonth !== endMonth) {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }

    return `${startMonth} ${startDay} - ${endDay}`;
  };

  const getCalendarDays = (year, month) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sunday) to 6 (Saturday)

    // Start of the calendar grid (might be in the previous month)
    const startDate = new Date(year, month, 1);
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const days = [];
    const temp = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }
    return days;
  };

  const getTaskDisplayId = (task) => {
    if (!task || !task._id) return "";

    // Project Name first character (upper case, fallback to 'P')
    const projChar = (activeProject?.name || "P").charAt(0).toUpperCase();

    // Client Name first 2 characters (upper case, fallback to 'XX')
    const clientName = activeProject?.client?.companyName || "";
    const clientChars = clientName
      ? clientName.substring(0, 2).toUpperCase().padEnd(2, "X")
      : "XX";

    // Get all tasks for this project
    const projectTasks = tasks.filter(
      (t) =>
        t.project?._id === activeProjectId || t.project === activeProjectId,
    );

    // Sort stably by createdAt or _id
    const sortedByCreation = [...projectTasks].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a._id || "").localeCompare(b._id || "");
    });

    const idx = sortedByCreation.findIndex((t) => t._id === task._id);
    const num = idx !== -1 ? idx + 1 : 1;
    return `${projChar}${clientChars}T${num}`;
  };

  const [inlineSubtaskTitle, setInlineSubtaskTitle] = useState({}); // taskId -> string
  const [selectedTaskId, setSelectedTaskId] = useState(null); // Live task ID for Drawer preview
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [collapsedSections, setCollapsedSections] = useState(() => {
    try {
      const saved = localStorage.getItem(
        `collapsedSections_${activeProjectId}`,
      );
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(
      `collapsedSections_${activeProjectId}`,
      JSON.stringify(collapsedSections),
    );
  }, [collapsedSections, activeProjectId]);

  const [openSectionMenu, setOpenSectionMenu] = useState(null); // sectionName
  const [editingSection, setEditingSection] = useState(null); // sectionName
  const [editSectionValue, setEditSectionValue] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [autoFocusSubtaskIdx, setAutoFocusSubtaskIdx] = useState(null);
  const [autoFocusDrawerSubtaskIdx, setAutoFocusDrawerSubtaskIdx] =
    useState(null);

  // Inline Task / Section creation states
  const [inlineAddingTaskSection, setInlineAddingTaskSection] = useState(null); // string (sectionName) or "__root__"
  const [inlineAddingSectionUnder, setInlineAddingSectionUnder] =
    useState(null); // string (sectionName) or "__root__"
  const [inlineTaskTitle, setInlineTaskTitle] = useState("");
  const [inlineSectionName, setInlineSectionName] = useState("");

  const inlineTaskInputRef = useRef(null);
  const inlineSectionInputRef = useRef(null);

  // Status Filter State
  const [statusFilter, setStatusFilter] = useState(() => {
    try {
      const saved = localStorage.getItem("ptb_status_filter");
      return saved ? saved : "All";
    } catch (e) {
      return "All";
    }
  });
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const statusFilterDropdownRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem("ptb_status_filter", statusFilter);
    } catch (e) {
      // ignore
    }
  }, [statusFilter]);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState(() => {
    try {
      const saved = localStorage.getItem("ptb_date_filter");
      return saved ? saved : "All Time";
    } catch (e) {
      return "All Time";
    }
  });
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const dateFilterDropdownRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("ptb_date_filter", dateFilter);
  }, [dateFilter]);

  // Hidden Columns State
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    try {
      const saved = localStorage.getItem("ptb_hidden_columns");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [openColMenu, setOpenColMenu] = useState(null); // "contentCopy" | "revision" | null
  const [isColsOpen, setIsColsOpen] = useState(false);
  const colsDropdownRef = useRef(null);

  const toggleColumnHide = (colId) => {
    setHiddenColumns((prev) => {
      const next = { ...prev, [colId]: !prev[colId] };
      localStorage.setItem("ptb_hidden_columns", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        colsDropdownRef.current &&
        !colsDropdownRef.current.contains(event.target)
      ) {
        setIsColsOpen(false);
      }
      if (
        dateFilterDropdownRef.current &&
        !dateFilterDropdownRef.current.contains(event.target)
      ) {
        setIsDateFilterOpen(false);
      }
      if (
        statusFilterDropdownRef.current &&
        !statusFilterDropdownRef.current.contains(event.target)
      ) {
        setIsStatusFilterOpen(false);
      }
      if (!event.target.closest(".col-header-menu")) {
        setOpenColMenu(null);
      }
      if (!event.target.closest(".section-menu-container")) {
        setOpenSectionMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRenameSectionSubmit = async (e, oldName) => {
    e.preventDefault();
    if (!editSectionValue.trim() || editSectionValue === oldName) {
      setEditingSection(null);
      return;
    }
    const newName = editSectionValue.trim();
    const currentSections =
      activeProject.sections?.length > 0 ? activeProject.sections : ["General"];
    const updatedSections = currentSections.map((s) =>
      s === oldName ? newName : s,
    );

    try {
      // Update project
      await dispatch(
        updateProject({
          id: activeProjectId,
          data: { sections: updatedSections },
        }),
      ).unwrap();

      // Update all tasks in this section
      const tasksToUpdate = tasks.filter(
        (t) => t.section === oldName || (!t.section && oldName === "General"),
      );
      await Promise.all(
        tasksToUpdate.map((t) =>
          updateTaskMutation({
            id: t._id,
            taskData: { section: newName },
          }).unwrap(),
        ),
      );
    } catch (err) {
      console.error("Failed to rename section:", err);
    }

    setEditingSection(null);
  };

  const handleDeleteSection = async (sectionName) => {
    if (
      window.confirm(
        `Are you sure you want to delete the section "${sectionName}" and ALL its tasks?`,
      )
    ) {
      const currentSections =
        activeProject.sections?.length > 0
          ? activeProject.sections
          : ["General"];
      const updatedSections = currentSections.filter((s) => s !== sectionName);

      try {
        await dispatch(
          updateProject({
            id: activeProjectId,
            data: { sections: updatedSections },
          }),
        ).unwrap();

        const tasksToDelete = tasks.filter(
          (t) =>
            t.section === sectionName ||
            (!t.section && sectionName === "General"),
        );
        await Promise.all(
          tasksToDelete.map((t) => deleteTaskMutation(t._id).unwrap()),
        );
      } catch (err) {
        console.error("Failed to delete section:", err);
      }
    }
    setOpenSectionMenu(null);
  };

  const toggleSection = (sectionName) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const toggleAllSections = () => {
    const projectSections = activeProject?.sections || [];
    const sectionsToRender =
      projectSections.length > 0 ? projectSections : ["General"];
    const allSections = Array.from(new Set(sectionsToRender));
    const areAllCollapsed = allSections.every((sec) => collapsedSections[sec]);

    if (areAllCollapsed) {
      setCollapsedSections({}); // open all
    } else {
      const newState = {};
      allSections.forEach((sec) => (newState[sec] = true));
      setCollapsedSections(newState); // collapse all
    }
  };

  // Add optimistic tasks state for dragging
  const [localTasks, setLocalTasks] = useState([]);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (inlineAddingTaskSection && inlineTaskInputRef.current) {
      inlineTaskInputRef.current.focus();
    }
  }, [inlineAddingTaskSection, localTasks.length]);

  useEffect(() => {
    if (inlineAddingSectionUnder && inlineSectionInputRef.current) {
      inlineSectionInputRef.current.focus();
    }
  }, [inlineAddingSectionUnder]);

  // Filter tasks for this project using localTasks for optimistic UI
  const activeProjectTasks = localTasks.filter((t) => {
    const projId = t.project?._id || t.project;
    return String(projId) === String(activeProjectId);
  });

  const filteredTasks = activeProjectTasks.filter((t) => {
    if (statusFilter !== "All") {
      const currentStatus = t.status || "Not Started";
      const statusUpper = currentStatus.toUpperCase();

      if (statusFilter === "Active Tasks") {
        const isCompleted = statusUpper === "COMPLETED";
        const isRejected = statusUpper === "REJECTED";
        if (isCompleted || isRejected) {
          return false;
        }
      } else if (statusFilter === "In Review") {
        if (t.status !== "In Review") {
          return false;
        }
      } else if (statusFilter === "In Progress") {
        if (statusUpper !== "IN PROGRESS") {
          return false;
        }
      } else if (statusFilter === "On Hold") {
        if (statusUpper !== "ON HOLD") {
          return false;
        }
      } else if (statusFilter === "Not Started") {
        if (statusUpper !== "PENDING") {
          return false;
        }
      } else {
        if (t.status !== statusFilter) {
          return false;
        }
      }
    }

    if (dateFilter === "All Time") return true;
    const taskDate = new Date(t.createdAt || new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === "Today") {
      return taskDate >= today;
    } else if (dateFilter === "Yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return taskDate >= yesterday && taskDate < today;
    } else if (dateFilter === "Last 7 Days") {
      const last7Days = new Date(today);
      last7Days.setDate(last7Days.getDate() - 7);
      return taskDate >= last7Days;
    } else if (dateFilter === "This Month") {
      return (
        taskDate.getMonth() === today.getMonth() &&
        taskDate.getFullYear() === today.getFullYear()
      );
    }
    return true;
  });
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === "Completed" && b.status !== "Completed") return 1;
    if (b.status === "Completed" && a.status !== "Completed") return -1;
    return 0;
  });

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    if (type === "SECTION") {
      const projectSections = activeProject.sections || [];
      const sectionsToRender =
        projectSections.length > 0 ? projectSections : ["General"];
      const uniqueSections = Array.from(new Set(sectionsToRender));

      const newSections = Array.from(uniqueSections);
      const [removed] = newSections.splice(source.index, 1);
      newSections.splice(destination.index, 0, removed);

      try {
        await dispatch(
          updateProject({
            id: activeProjectId,
            data: { sections: newSections },
          }),
        ).unwrap();
        // Section reorder toast removed
      } catch (err) {
        console.error("Failed to reorder sections:", err);
        toast.error("Failed to reorder sections");
      }
      return;
    }

    // Optimistically update local UI for section
    const updatedTasks = localTasks.map((t) =>
      t._id === draggableId ? { ...t, section: destination.droppableId } : t,
    );
    setLocalTasks(updatedTasks);

    try {
      await updateTaskMutation({
        id: draggableId,
        taskData: { section: destination.droppableId },
      }).unwrap();
    } catch (err) {
      console.error("Failed to drag and drop task:", err);
    }
  };

  // Live selected task from localTasks state
  const selectedTask = localTasks.find((t) => t._id === selectedTaskId);

  const handleAddSectionSubmit = async (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    const nameToCreate = newSectionName.trim();
    const currentSections =
      activeProject.sections?.length > 0 ? activeProject.sections : ["General"];
    const updatedSections = [...currentSections, nameToCreate];

    try {
      await dispatch(
        updateProject({
          id: activeProjectId,
          data: { sections: updatedSections },
        }),
      ).unwrap();
    } catch (err) {
      console.error("Failed to add section:", err);
    }

    setIsAddingSection(false);
    setNewSectionName("");
  };

  const handleInlineAddSection = async (nameToCreate) => {
    if (!nameToCreate || !nameToCreate.trim()) return;
    const trimmedName = nameToCreate.trim();
    const currentSections = activeProject.sections || [];
    if (currentSections.includes(trimmedName)) {
      toast.error("Section already exists");
      return;
    }
    const updatedSections = [...currentSections, trimmedName];

    try {
      await dispatch(
        updateProject({
          id: activeProjectId,
          data: { sections: updatedSections },
        }),
      ).unwrap();
      toast.success(`Section "${trimmedName}" created`);
    } catch (err) {
      console.error("Failed to add section:", err);
      toast.error("Failed to create section");
    }
  };

  const handleInlineAddTaskSubmit = async (e, sectionName) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inlineTaskTitle.trim()) return;

    let targetSection = sectionName === "__root__" ? "General" : sectionName;
    const titleToCreate = inlineTaskTitle.trim();

    try {
      // If no sections exist yet in the project, create "General" section first
      const currentSections = activeProject.sections || [];
      if (currentSections.length === 0) {
        targetSection = "General";
        await dispatch(
          updateProject({
            id: activeProjectId,
            data: { sections: [targetSection] },
          }),
        ).unwrap();
      }

      // Create task via mutation
      const response = await createTaskMutation({
        title: titleToCreate,
        project: activeProjectId,
        section: targetSection,
        assignedTo: null,
        dueDate: null,
        priority: "Medium",
        status: "Not Started",
      }).unwrap();

      if (response && response.data) {
        setLocalTasks((prev) => [...prev, response.data]);
      }

      // Reset inline task input but KEEP it active under targetSection and auto-focused!
      setInlineTaskTitle("");
      setInlineAddingTaskSection(targetSection);
    } catch (err) {
      console.error("Failed to add task inline:", err);
      const serverMsg =
        err?.data?.message ||
        err?.message ||
        (err?.data ? JSON.stringify(err.data) : "");
      toast.error(
        serverMsg
          ? `Failed to create task: ${serverMsg}`
          : "Failed to create task",
      );
    }
  };

  // Add Task directly to DB (autosave pattern)
  const handleAddTask = async (sectionName) => {
    const resolvedSectionName =
      sectionName ||
      (activeProject?.sections?.length > 0
        ? activeProject.sections[0]
        : "General");
    const tempId = "temp-" + Date.now();
    const tempTask = {
      _id: tempId,
      title: "",
      project: activeProjectId,
      section: resolvedSectionName,
      assignedTo: null,
      startDate: new Date().toISOString(),
      dueDate: null,
      priority: "Medium",
      status: "Not Started",
      createdAt: new Date().toISOString(),
      subtasks: [],
      comments: [],
      attachments: [],
      createdBy: currentUser,
    };

    setFocusedTaskId(tempId);
    setLocalTasks((prev) => [...prev, tempTask]);

    try {
      const response = await createTaskMutation({
        title: "",
        project: activeProjectId,
        section: resolvedSectionName,
        assignedTo: null,
        dueDate: null,
        priority: "Medium",
        status: "Not Started",
      }).unwrap();

      if (response && response.data) {
        setLocalTasks((prev) =>
          prev.map((t) => (t._id === tempId ? response.data : t)),
        );
      }
    } catch (err) {
      console.error("Failed to add task:", err);
      setLocalTasks((prev) => prev.filter((t) => t._id !== tempId));
    }
  };

  // Auto-create a default task logic is removed per user request for empty starting table.

  // Add Task directly to DB with preselected status (Board view helper)
  const handleAddTaskWithStatus = async (status) => {
    const tempId = "temp-" + Date.now();
    const defaultSection =
      activeProject?.sections?.length > 0
        ? activeProject.sections[0]
        : "General";

    const tempTask = {
      _id: tempId,
      title: "Add Task",
      project: activeProjectId,
      section: defaultSection,
      assignedTo: null,
      startDate: new Date().toISOString(),
      dueDate: null,
      priority: "Medium",
      status: status,
      createdAt: new Date().toISOString(),
      subtasks: [],
      comments: [],
      attachments: [],
      createdBy: currentUser,
    };

    setFocusedTaskId(tempId);
    setLocalTasks((prev) => [...prev, tempTask]);

    try {
      const response = await createTaskMutation({
        title: "Add Task",
        project: activeProjectId,
        assignedTo: null,
        dueDate: null,
        priority: "Medium",
        status: status,
      }).unwrap();

      if (response && response.data) {
        setLocalTasks((prev) =>
          prev.map((t) => (t._id === tempId ? response.data : t)),
        );
      }
    } catch (err) {
      console.error("Failed to add task:", err);
      setLocalTasks((prev) => prev.filter((t) => t._id !== tempId));
    }
  };

  const showStartInProgressWarning = (action = "review") => {
    const actionMsg =
      action === "hold"
        ? "before placing it on hold."
        : "before submitting it for review.";

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full pointer-events-auto flex flex-col gap-4 p-5 rounded-2xl shadow-2xl border
          bg-white dark:bg-[#0f172a]
          border-amber-500/40 dark:border-amber-500/40
          backdrop-blur-xl z-[99999]`}
        >
          <div className="flex items-start gap-3.5">
            <div className="shrink-0 w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <FiClock size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
                Action Required: Start Task First
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                Please start the task by setting its status to{" "}
                <strong className="text-amber-600 dark:text-amber-400 font-bold">
                  "In Progress"
                </strong>{" "}
                {actionMsg}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      ),
      { duration: 6000 },
    );
  };

  const [reviewModalData, setReviewModalData] = useState(null);
  const [completeModalData, setCompleteModalData] = useState(null);

  const handleConfirmReviewSubmit = async () => {
    if (!reviewModalData) return;
    const { taskId, fields, isSubtask, taskObj, subtaskId } = reviewModalData;
    setReviewModalData(null);
    try {
      if (isSubtask) {
        const updatedSubtasks = (taskObj.subtasks || []).map((s) => {
          if (s._id === subtaskId) {
            return { ...s, ...fields };
          }
          return s;
        });
        await updateTaskMutation({
          id: taskId,
          taskData: { subtasks: updatedSubtasks },
        }).unwrap();
      } else {
        await updateTaskMutation({
          id: taskId,
          taskData: fields,
        }).unwrap();
      }
      toast.success("Submitted for review successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to submit for review.");
    }
  };

  const handleConfirmComplete = async () => {
    if (!completeModalData) return;
    const { taskId, fields, isSubtask, taskObj, subtaskId } = completeModalData;
    setCompleteModalData(null);
    try {
      if (isSubtask) {
        const updatedSubtasks = (taskObj.subtasks || []).map((s) => {
          if (s._id === subtaskId) {
            return { ...s, ...fields };
          }
          return s;
        });
        await updateTaskMutation({
          id: taskId,
          taskData: { subtasks: updatedSubtasks },
        }).unwrap();
      } else {
        await updateTaskMutation({
          id: taskId,
          taskData: fields,
        }).unwrap();
      }
      toast.success("Task marked as completed successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to mark task as completed.");
    }
  };

  // Update Task fields inline / autosave
  const handleTaskFieldChange = async (taskId, fields) => {
    if (fields.status === "In Review") {
      const taskObj = localTasks.find((t) => t._id === taskId);
      if (taskObj && !taskObj.actualStartTime && !taskObj.totalTrackedTime) {
        showStartInProgressWarning("review");
        return;
      }
      if (taskObj && taskObj.status !== fields.status) {
        setReviewModalData({ taskId, fields, isSubtask: false });
        return;
      }
    }

    if (fields.status === "On Hold") {
      const taskObj = localTasks.find((t) => t._id === taskId);
      if (taskObj && !taskObj.actualStartTime && !taskObj.totalTrackedTime && taskObj.contentType !== "MOM") {
        showStartInProgressWarning("hold");
        return;
      }
    }

    if (fields.status === "Completed") {
      const taskObj = localTasks.find((t) => t._id === taskId);
      if (taskObj && taskObj.status !== "Completed") {
        setCompleteModalData({
          taskId,
          fields,
          isSubtask: false,
          taskName: taskObj.title,
        });
        return;
      }
    }

    // Intercept correction status
    if (fields.status === "Correction") {
      const taskObj = localTasks.find((t) => t._id === taskId);
      setTaskToCorrect({
        taskId,
        subtaskId: null,
        previousStatus: taskObj?.status,
        taskObj,
      });
      setCorrectionModalOpen(true);
      return;
    }

    // Intercept rejection status
    if (fields.status === "Rejected") {
      const taskObj = localTasks.find((t) => t._id === taskId);
      setTaskToReject({
        taskId,
        subtaskId: null,
        previousStatus: taskObj?.status,
        taskObj,
      });
      setRejectionModalOpen(true);
      return;
    }

    const sanitizedFields = { ...fields };
    if (sanitizedFields.assignedTo === "") sanitizedFields.assignedTo = null;
    if (sanitizedFields.dueDate === "") sanitizedFields.dueDate = null;
    if (sanitizedFields.startDate === "") sanitizedFields.startDate = null;

    const currentTask = localTasks.find((t) => t._id === taskId);

    // Block modifying or clearing Start Date if already set
    if (currentTask?.startDate) {
      if (
        sanitizedFields.startDate === null ||
        (sanitizedFields.startDate !== undefined &&
          new Date(sanitizedFields.startDate).toISOString().split("T")[0] !==
            new Date(currentTask.startDate).toISOString().split("T")[0])
      ) {
        toast.error("🔒 Start Date is locked once set and cannot be changed.");
        return;
      }
    }

    // Block modifying or clearing End Date (dueDate) if already set
    if (currentTask?.dueDate) {
      if (
        sanitizedFields.dueDate === null ||
        (sanitizedFields.dueDate !== undefined &&
          new Date(sanitizedFields.dueDate).toISOString().split("T")[0] !==
            new Date(currentTask.dueDate).toISOString().split("T")[0])
      ) {
        toast.error("🔒 End Date is locked once set and cannot be changed.");
        return;
      }
    }

    // Check date requirement before assigning member
    if (sanitizedFields.assignedTo) {
      const currentTask = localTasks.find((t) => t._id === taskId);
      const effectiveStart =
        sanitizedFields.startDate !== undefined
          ? sanitizedFields.startDate
          : currentTask?.startDate;
      const effectiveEnd =
        sanitizedFields.dueDate !== undefined
          ? sanitizedFields.dueDate
          : currentTask?.dueDate;

      if (!effectiveStart || !effectiveEnd) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-slate-900/95 dark:bg-[#121217] text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-2 ring-amber-500/50 p-4 gap-3.5 items-center border border-amber-500/40 backdrop-blur-xl z-[99999]`}
            >
              <div className="text-3xl animate-bounce shrink-0">🗓️</div>
              <div className="flex-1 text-xs">
                <p className="font-extrabold text-amber-400 text-sm flex items-center gap-1.5">
                  <span>Please assign Start Date & End Date first!</span>
                  <span>✨</span>
                </p>
                <p className="text-slate-300 font-medium mt-1 leading-snug">
                  Please assign Start Date and End Date before assigning a team
                  member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>
          ),
          { duration: 4500 },
        );
        return;
      }
    }

    // If startDate is being set, auto-clear dueDate if it falls before the new startDate
    if (sanitizedFields.startDate) {
      const currentTask = localTasks.find((t) => t._id === taskId);
      if (currentTask?.dueDate) {
        const newStart = new Date(sanitizedFields.startDate);
        const existingEnd = new Date(currentTask.dueDate);
        newStart.setHours(0, 0, 0, 0);
        existingEnd.setHours(0, 0, 0, 0);
        if (existingEnd < newStart) {
          sanitizedFields.dueDate = null;
        }
      }
    }

    // If dueDate is being set, ensure it is not before startDate
    if (sanitizedFields.dueDate) {
      const currentTask = localTasks.find((t) => t._id === taskId);
      const startRef = sanitizedFields.startDate || currentTask?.startDate;
      if (startRef) {
        const start = new Date(startRef);
        const end = new Date(sanitizedFields.dueDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        if (end < start) {
          return; // Block invalid end date
        }
      }
    }

    const currentTaskForPriority = localTasks.find((t) => t._id === taskId);
    const effectiveStart =
      sanitizedFields.startDate !== undefined
        ? sanitizedFields.startDate
        : currentTaskForPriority?.startDate;
    const effectiveEnd =
      sanitizedFields.dueDate !== undefined
        ? sanitizedFields.dueDate
        : currentTaskForPriority?.dueDate;

    if (
      effectiveStart &&
      effectiveEnd &&
      isSameDate(effectiveStart, effectiveEnd)
    ) {
      sanitizedFields.priority = "Top High";
    }

    setLocalTasks((prev) =>
      prev.map((t) => {
        if (t._id === taskId) {
          return { ...t, ...sanitizedFields };
        }
        return t;
      }),
    );

    if (String(taskId).startsWith("temp-")) {
      return;
    }

    try {
      await updateTaskMutation({
        id: taskId,
        taskData: sanitizedFields,
      }).unwrap();
    } catch (err) {
      console.error("Failed to update task:", err);

      if (
        err?.data?.isOfficeHoursEnded ||
        err?.error?.data?.isOfficeHoursEnded
      ) {
        const errorData = err?.data || err?.error?.data;
        window.dispatchEvent(
          new CustomEvent("show-office-hours-ended-popup", {
            detail: {
              workingTimeMs: errorData.workingTimeMs,
              pausedAtHour: errorData.pausedAt,
            },
          }),
        );
        dispatch(apiSlice.util.invalidateTags(["Task"]));
        return;
      }

      if (err?.status === 409) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-sm w-full pointer-events-auto flex flex-col gap-3 p-4 rounded-2xl shadow-2xl border
          bg-white dark:bg-[#0f172a]
          border-[var(--accent-color)]/30 dark:border-[var(--accent-color-dark)]/30
          backdrop-blur-xl z-[99999]`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ background: "var(--accent-light-bg-subtle)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent-color)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12px] font-black tracking-wide"
                    style={{ color: "var(--accent-color)" }}
                  >
                    Active Task Already Running
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {err?.data?.message ||
                      "You already have one active task or subtask."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <FiX size={13} />
                </button>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.dismiss(t.id);
                    updateTaskMutation({
                      id: taskId,
                      taskData: { ...sanitizedFields, forceSwitch: true },
                    });
                  }}
                  className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-black text-white transition-all cursor-pointer shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent-color), var(--accent-color-dark))",
                  }}
                >
                  Switch Task
                </button>
              </div>
            </div>
          ),
          { duration: 6000, position: "bottom-right" },
        );
      } else {
        toast.error("Failed to update task");
      }

      throw err;
    }
  };

  // Add Comment Handler
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    const commentData = {
      user: currentUser?._id,
      text: newComment.trim(),
      createdAt: new Date(),
    };

    // Dispatch to DB
    try {
      await updateTaskMutation({
        id: selectedTask._id,
        taskData: {
          comments: [
            ...(selectedTask.comments || []).map((c) => ({
              user: c.user?._id || c.user,
              text: c.text,
              createdAt: c.createdAt,
            })),
            commentData,
          ],
        },
      }).unwrap();
    } catch (err) {
      console.error("Failed to add comment:", err);
    }

    setNewComment("");
  };

  // Upload Attachment Handler
  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedTask) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      toast.loading("Uploading attachment...", { id: "upload" });

      const config = {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
          "Content-Type": "multipart/form-data",
        },
      };

      const { data } = await axiosInstance.post(
        "/messages/upload",
        formData,
        config,
      );

      if (data.success) {
        const attachmentData = {
          url: data.data.url,
          filename: data.data.filename,
          fileType: data.data.fileType,
          uploadedBy: currentUser?._id,
          uploadedAt: new Date(),
        };

        await updateTaskMutation({
          id: selectedTask._id,
          taskData: {
            attachments: [
              ...(selectedTask.attachments || []).map((a) => ({
                ...a,
                uploadedBy: a.uploadedBy?._id || a.uploadedBy,
              })),
              attachmentData,
            ],
          },
        }).unwrap();

        toast.success("Attachment uploaded successfully!", { id: "upload" });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload attachment", { id: "upload" });
    } finally {
      setIsUploading(false);
      e.target.value = null; // reset input
    }
  };

  // Add subtask (continuous addition helper)
  const handleAddSubtask = async (task, subtaskTitle) => {
    if (!subtaskTitle || !subtaskTitle.trim()) return;

    const newSubtask = {
      title: subtaskTitle.trim(),
      status: "Not Started",
      assignedTo: null,
      startDate: new Date().toISOString(),
      dueDate: null,
      priority: "Medium",
    };

    const updatedSubtasks = [...(task.subtasks || []), newSubtask];
    try {
      await updateTaskMutation({
        id: task._id,
        taskData: { subtasks: updatedSubtasks },
      }).unwrap();
    } catch (err) {
      console.error("Failed to add subtask:", err);
    }
  };

  // Add subtask from inline form in table
  const handleInlineAddSubtaskSubmit = (e, task) => {
    e.preventDefault();
    const title = inlineSubtaskTitle[task._id];
    if (!title || !title.trim()) return;

    handleAddSubtask(task, title);
    setInlineSubtaskTitle((prev) => ({ ...prev, [task._id]: "" }));
  };

  // Update specific subtask fields
  const handleSubtaskFieldChange = async (task, subtaskId, updatedFields) => {
    if (updatedFields.status === "In Review") {
      const subtaskObj = task.subtasks?.find((s) => s._id === subtaskId);
      if (subtaskObj && !subtaskObj.actualStartTime && !subtaskObj.totalTrackedTime) {
        showStartInProgressWarning("review");
        return;
      }
      if (subtaskObj && subtaskObj.status !== updatedFields.status) {
        setReviewModalData({
          taskId: task._id,
          fields: updatedFields,
          isSubtask: true,
          taskObj: task,
          subtaskId,
        });
        return;
      }
    }

    if (updatedFields.status === "On Hold") {
      const subtaskObj = task.subtasks?.find((s) => s._id === subtaskId);
      if (subtaskObj && !subtaskObj.actualStartTime && !subtaskObj.totalTrackedTime && (subtaskObj.contentType !== "MOM" && task.contentType !== "MOM")) {
        showStartInProgressWarning("hold");
        return;
      }
    }

    if (updatedFields.status === "Completed") {
      const subtaskObj = task.subtasks?.find((s) => s._id === subtaskId);
      if (subtaskObj && subtaskObj.status !== "Completed") {
        setCompleteModalData({
          taskId: task._id,
          fields: updatedFields,
          isSubtask: true,
          taskObj: task,
          subtaskId,
          taskName: subtaskObj.title || task.title,
        });
        return;
      }
    }

    // Intercept correction status
    if (updatedFields.status === "Correction") {
      const subtaskObj = task.subtasks?.find((s) => s._id === subtaskId);
      setTaskToCorrect({
        taskId: task._id,
        subtaskId,
        previousStatus: subtaskObj?.status,
        taskObj: task,
      });
      setCorrectionModalOpen(true);
      return;
    }

    // Intercept rejection status
    if (updatedFields.status === "Rejected") {
      const subtaskObj = task.subtasks?.find((s) => s._id === subtaskId);
      setTaskToReject({
        taskId: task._id,
        subtaskId,
        previousStatus: subtaskObj?.status,
        taskObj: task,
      });
      setRejectionModalOpen(true);
      return;
    }

    const sanitizedFields = { ...updatedFields };
    if (sanitizedFields.assignedTo === "") sanitizedFields.assignedTo = null;
    if (sanitizedFields.startDate === "") sanitizedFields.startDate = null;
    if (sanitizedFields.dueDate === "") sanitizedFields.dueDate = null;

    const currentSub = task.subtasks?.find((s) => s._id === subtaskId);

    // Block modifying or clearing Subtask Start Date if already set
    if (currentSub?.startDate) {
      if (
        sanitizedFields.startDate === null ||
        (sanitizedFields.startDate !== undefined &&
          new Date(sanitizedFields.startDate).toISOString().split("T")[0] !==
            new Date(currentSub.startDate).toISOString().split("T")[0])
      ) {
        toast.error(
          "🔒 Subtask Start Date is locked once set and cannot be changed.",
        );
        return;
      }
    }

    // Block modifying or clearing Subtask End Date (dueDate) if already set
    if (currentSub?.dueDate) {
      if (
        sanitizedFields.dueDate === null ||
        (sanitizedFields.dueDate !== undefined &&
          new Date(sanitizedFields.dueDate).toISOString().split("T")[0] !==
            new Date(currentSub.dueDate).toISOString().split("T")[0])
      ) {
        toast.error(
          "🔒 Subtask End Date is locked once set and cannot be changed.",
        );
        return;
      }
    }

    // Check date requirement before assigning member on subtask
    if (sanitizedFields.assignedTo) {
      const effectiveStart =
        sanitizedFields.startDate !== undefined
          ? sanitizedFields.startDate
          : currentSub?.startDate || task?.startDate;
      const effectiveEnd =
        sanitizedFields.dueDate !== undefined
          ? sanitizedFields.dueDate
          : currentSub?.dueDate || task?.dueDate;

      if (!effectiveStart || !effectiveEnd) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-slate-900/95 dark:bg-[#121217] text-white shadow-2xl rounded-2xl pointer-events-auto flex ring-2 ring-amber-500/50 p-4 gap-3.5 items-center border border-amber-500/40 backdrop-blur-xl z-[99999]`}
            >
              <div className="text-3xl animate-bounce shrink-0">🗓️</div>
              <div className="flex-1 text-xs">
                <p className="font-extrabold text-amber-400 text-sm flex items-center gap-1.5">
                  <span>Please assign Start Date & End Date first!</span>
                  <span>✨</span>
                </p>
                <p className="text-slate-300 font-medium mt-1 leading-snug">
                  Please assign Start Date and End Date before assigning a team
                  member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>
          ),
          { duration: 4500 },
        );
        return;
      }
    }

    // If startDate is being set, auto-clear dueDate if it falls before the new startDate
    if (sanitizedFields.startDate && currentSub?.dueDate) {
      const newStart = new Date(sanitizedFields.startDate);
      const existingEnd = new Date(currentSub.dueDate);
      newStart.setHours(0, 0, 0, 0);
      existingEnd.setHours(0, 0, 0, 0);
      if (existingEnd < newStart) {
        sanitizedFields.dueDate = null;
      }
    }

    // If dueDate is being set, ensure it is not before startDate
    if (sanitizedFields.dueDate) {
      const startRef = sanitizedFields.startDate || currentSub?.startDate;
      if (startRef) {
        const start = new Date(startRef);
        const end = new Date(sanitizedFields.dueDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        if (end < start) {
          return; // Block invalid end date
        }
      }
    }

    const effectiveSubStart =
      sanitizedFields.startDate !== undefined
        ? sanitizedFields.startDate
        : currentSub?.startDate || task?.startDate;
    const effectiveSubEnd =
      sanitizedFields.dueDate !== undefined
        ? sanitizedFields.dueDate
        : currentSub?.dueDate || task?.dueDate;

    if (
      effectiveSubStart &&
      effectiveSubEnd &&
      isSameDate(effectiveSubStart, effectiveSubEnd)
    ) {
      sanitizedFields.priority = "Top High";
    }

    const updatedSubtasks = task.subtasks.map((sub) =>
      sub._id === subtaskId ? { ...sub, ...sanitizedFields } : sub,
    );
    try {
      await updateTaskMutation({
        id: task._id,
        taskData: { subtasks: updatedSubtasks },
      }).unwrap();
    } catch (err) {
      console.error("Failed to update subtask:", err);
    }
  };

  // Handle Submission of Rejection Modal
  const handleRejectSubmit = async (reason) => {
    if (!taskToReject) return;

    const rejItem = {
      reason,
      rejectedBy: currentUser?._id || currentUser?.id || currentUser,
      rejectedAt: new Date().toISOString(),
    };

    if (taskToReject.subtaskId) {
      // Subtask Rejection
      const task = taskToReject.taskObj;
      const subtask = task.subtasks?.find(
        (s) => s._id === taskToReject.subtaskId,
      );
      const currentHistory = subtask?.rejectionHistory || [];
      const updatedHistory = [...currentHistory, rejItem];

      const updatedSubtasks = task.subtasks.map((sub) =>
        sub._id === taskToReject.subtaskId
          ? { ...sub, status: "Rejected", rejectionHistory: updatedHistory }
          : sub,
      );

      try {
        await updateTaskMutation({
          id: task._id,
          taskData: { subtasks: updatedSubtasks },
        }).unwrap();
        toast.success("Subtask marked as Rejected");
      } catch (err) {
        console.error("Failed to reject subtask:", err);
      }
    } else {
      // Task Rejection
      const task = taskToReject.taskObj;
      const currentHistory = task?.rejectionHistory || [];
      const updatedHistory = [...currentHistory, rejItem];

      // Optimistic update
      setLocalTasks((prev) =>
        prev.map((t) =>
          t._id === task._id
            ? { ...t, status: "Rejected", rejectionHistory: updatedHistory }
            : t,
        ),
      );

      try {
        await updateTaskMutation({
          id: task._id,
          taskData: { status: "Rejected", rejectionHistory: updatedHistory },
        }).unwrap();
        toast.success("Task marked as Rejected");
      } catch (err) {
        console.error("Failed to reject task:", err);
        // revert local change if needed
        setLocalTasks((prev) =>
          prev.map((t) =>
            t._id === task._id
              ? {
                  ...t,
                  status: taskToReject.previousStatus,
                  rejectionHistory: currentHistory,
                }
              : t,
          ),
        );
      }
    }

    setRejectionModalOpen(false);
    setTaskToReject(null);
  };

  // Handle Submission of Correction Modal
  const handleCorrectionSubmit = async (reason) => {
    if (!taskToCorrect) return;

    if (taskToCorrect.subtaskId) {
      const task = taskToCorrect.taskObj;
      const updatedSubtasks = (task.subtasks || []).map((sub) =>
        sub._id === taskToCorrect.subtaskId
          ? { ...sub, status: "Correction", correctionReason: reason }
          : sub,
      );

      try {
        await updateTaskMutation({
          id: task._id,
          taskData: { subtasks: updatedSubtasks },
        }).unwrap();
        toast.success("Subtask sent for Correction");
      } catch (err) {
        console.error("Failed to send subtask for correction:", err);
      }
    } else {
      const task = taskToCorrect.taskObj;
      try {
        await updateTaskMutation({
          id: task._id,
          taskData: { status: "Correction", correctionReason: reason },
        }).unwrap();
        toast.success("Task sent for Correction");
      } catch (err) {
        console.error("Failed to send task for correction:", err);
      }
    }

    setCorrectionModalOpen(false);
    setTaskToCorrect(null);
  };

  // Insert new subtask on Enter key press
  const handleSubtaskEnterKey = async (
    task,
    subIdx,
    currentVal,
    isDrawer = false,
  ) => {
    // 1. Prepare subtasks array and update current subtask title if it changed
    const updatedSubtasks = (task.subtasks || []).map((s, idx) =>
      idx === subIdx ? { ...s, title: currentVal } : s,
    );

    // 2. Insert new subtask right after subIdx
    const newSubtask = {
      title: "",
      status: "Not Started",
      assignedTo: null,
      startDate: new Date().toISOString(),
      dueDate: null,
      priority: "Medium",
    };
    updatedSubtasks.splice(subIdx + 1, 0, newSubtask);

    // 3. Set auto-focus index state
    if (isDrawer) {
      setAutoFocusDrawerSubtaskIdx(subIdx + 1);
    } else {
      setAutoFocusSubtaskIdx(subIdx + 1);
    }

    // 4. Save to backend
    try {
      await updateTaskMutation({
        id: task._id,
        taskData: { subtasks: updatedSubtasks },
      }).unwrap();
    } catch (err) {
      console.error("Failed to insert subtask on Enter:", err);
    }
  };

  // Add subtask via plus button in the table row
  const handleAddSubtaskViaButton = async (task) => {
    // Expand the parent task
    setExpandedTasks((prev) => ({ ...prev, [task._id]: true }));

    const newSubtask = {
      title: "",
      status: "Not Started",
      assignedTo: null,
      startDate: new Date().toISOString(),
      dueDate: null,
      priority: "Medium",
    };
    const updatedSubtasks = [...(task.subtasks || []), newSubtask];

    // Auto focus the new subtask (at the end of the array)
    setAutoFocusSubtaskIdx((task.subtasks || []).length);

    try {
      await updateTaskMutation({
        id: task._id,
        taskData: { subtasks: updatedSubtasks },
      }).unwrap();
    } catch (err) {
      console.error("Failed to add subtask via button:", err);
    }
  };

  // Delete Subtask
  const handleDeleteSubtask = async (task, subtaskId) => {
    const updatedSubtasks = task.subtasks.filter(
      (sub) => sub._id !== subtaskId,
    );
    try {
      await updateTaskMutation({
        id: task._id,
        taskData: { subtasks: updatedSubtasks },
      }).unwrap();
    } catch (err) {
      console.error("Failed to delete subtask:", err);
    }
  };

  // Delete parent Task
  const handleParentTaskDelete = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
      try {
        await deleteTaskMutation(taskId).unwrap();
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    }
  };

  // Bulk Delete Tasks in a Section
  const handleBulkDelete = async (sectionTasks, sectionName) => {
    const idsToDelete = Object.keys(selectedTasks).filter(
      (id) => selectedTasks[id] && sectionTasks.some((t) => t._id === id),
    );

    if (idsToDelete.length === 0) return;

    if (
      window.confirm(
        `Are you sure you want to delete the ${idsToDelete.length} selected task(s)?`,
      )
    ) {
      try {
        await Promise.all(
          idsToDelete.map((id) => deleteTaskMutation(id).unwrap()),
        );
        setSelectedTasks((prev) => {
          const next = { ...prev };
          idsToDelete.forEach((id) => delete next[id]);
          return next;
        });
        if (sectionName) {
          setSelectionModeSections((prev) => ({
            ...prev,
            [sectionName]: false,
          }));
        }
      } catch (err) {
        console.error("Failed to delete selected tasks:", err);
      }
    }
  };

  const toggleTaskExpanded = (taskId) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Dashboard calculations
  const totalTasks = activeProjectTasks.length;
  const completedTasks = activeProjectTasks.filter(
    (t) => t.status === "Completed",
  ).length;
  const incompleteTasks = activeProjectTasks.filter(
    (t) => t.status !== "Completed",
  ).length;

  // Overdue count calculation
  const overdueTasks = activeProjectTasks.filter((t) => {
    if (t.status === "Completed") return false;
    if (!t.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Breakdown of incomplete tasks for Bar Chart
  const pendingCount = activeProjectTasks.filter(
    (t) => t.status === "Not Started",
  ).length;
  const inProgressCount = activeProjectTasks.filter(
    (t) => t.status === "In Progress",
  ).length;
  const onHoldCount = activeProjectTasks.filter(
    (t) => t.status === "On Hold",
  ).length;

  return (
    <div className="space-y-6 w-full max-w-8xl mx-auto px-2 md:px-0 relative">
      {/* WORKSPACE HEADER & PROGRESS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-4 mb-4 pb-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3 min-w-0 w-full lg:flex-1 order-1 lg:order-none">
          <div className="space-y-2 w-full">
            <div className="flex items-center gap-3">
              <div>
                {/* Breadcrumb Back Button */}
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 transition-colors"
                >
                  <FiChevronLeft size={16} />
                </button>
              </div>
              <ProjectIcon
                name={activeProject.name}
                size="lg"
                className="shadow-md"
              />
              <div className="flex items-center gap-2 min-w-0 truncate">
                <h1 className="text-lg sm:text-[15px] font-bold text-slate-800 dark:text-white truncate">
                  {activeProject.name}
                </h1>
                {(() => {
                  const clientId =
                    activeProject?.client?._id || activeProject?.client;
                  const clientObj = clients?.find((c) => c._id === clientId);
                  return clientObj ? (
                    <ClientBadge
                      client={clientObj}
                      size="sm"
                      className="ml-2"
                    />
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* ACTION HEADER: ADD TASK & TABS SELECTOR */}

        {/* Left Side: Spacer to keep Tab Selector centered */}



        {/* Right Side: Filter & Sort Popover Dropdowns */}
        <div className="flex items-center px-15 justify-between lg:justify-end gap-2 w-full lg:flex-1 order-3 lg:order-none relative">
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
              {/* Status Filter Dropdown */}
              <div className="relative" ref={statusFilterDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-200 whitespace-nowrap ${
                    isStatusFilterOpen || statusFilter !== "All"
                      ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-transparent text-blue-600 dark:text-blue-400"
                      : "bg-white dark:bg-[#111] border-slate-200/80 dark:border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <FiFilter className="shrink-0" size={13} />
                  <span>
                    {statusFilter === "All" ? "All Status" : statusFilter}
                  </span>
                  <FiChevronDown
                    className="shrink-0 text-slate-400"
                    size={13}
                  />
                </button>

                <AnimatePresence>
                  {isStatusFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#111] border border-slate-200/80 dark:border-transparent rounded-2xl shadow-2xl p-2 z-50 space-y-1 backdrop-blur-md"
                    >
                      {[
                        "All",
                        "Active Tasks",
                        "Not Started",
                        "In Progress",
                        "On Hold",
                        "In Review",
                        "Completed",
                      ].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setStatusFilter(option);
                            setIsStatusFilterOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                            statusFilter === option
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Date Filter Dropdown */}
              <div className="relative" ref={dateFilterDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-200 whitespace-nowrap ${
                    isDateFilterOpen || dateFilter !== "All Time"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-transparent text-emerald-600 dark:text-emerald-400"
                      : "bg-white dark:bg-[#111] border-slate-200/80 dark:border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <FiFilter className="shrink-0" size={13} />
                  <span>{dateFilter}</span>
                  <FiChevronDown
                    className="shrink-0 text-slate-400"
                    size={13}
                  />
                </button>

                <AnimatePresence>
                  {isDateFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#111] border border-slate-200/80 dark:border-transparent rounded-2xl shadow-2xl p-2 z-50 space-y-1 backdrop-blur-md"
                    >
                      {[
                        "Today",
                        "Yesterday",
                        "Last 7 Days",
                        "This Month",
                        "All Time",
                      ].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setDateFilter(option);
                            setIsDateFilterOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                            dateFilter === option
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Columns Trigger Button */}
              <div className="relative" ref={colsDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsColsOpen(!isColsOpen);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-200 whitespace-nowrap ${
                    isColsOpen || Object.values(hiddenColumns).some(Boolean)
                      ? "bg-blue-50 dark:bg-[#3b82f6]/10 border-blue-200 dark:border-transparent text-blue-600 dark:text-[#3b82f6]"
                      : "bg-white dark:bg-[#111] border-slate-200/80 dark:border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <FiColumns className="shrink-0" size={13} />
                  <span>Hide Columns</span>
                  {Object.values(hiddenColumns).filter(Boolean).length > 0 && (
                    <span className="text-[10px] font-bold bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center ml-0.5">
                      {Object.values(hiddenColumns).filter(Boolean).length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isColsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#111] border border-slate-200/80 dark:border-transparent rounded-2xl shadow-2xl p-2.5 z-50 space-y-1.5 backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 px-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-white tracking-wider">
                          Toggle Columns
                        </span>
                        {Object.values(hiddenColumns).some(Boolean) && (
                          <button
                            type="button"
                            onClick={() => {
                              setHiddenColumns({});
                              localStorage.removeItem("ptb_hidden_columns");
                            }}
                            className="text-[10px] font-bold text-blue-500 hover:text-blue-600 cursor-pointer"
                          >
                            Show All
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 pt-1">
                        {[
                          { id: "contentCopy", label: "Content Copy" },
                          { id: "client", label: "Client" },
                          { id: "createdBy", label: "Owner" },
                          { id: "assignee", label: "Assignee" },
                          { id: "contentType", label: "Content Type" },
                          { id: "startDate", label: "Start Date" },
                          { id: "endDate", label: "End Date" },
                          { id: "priority", label: "Priority" },
                          { id: "status", label: "Status" },
                          { id: "revision", label: "Revision" },
                          {
                            id: "totalHours",
                            label: "Total productivity - (total inprogress) ",
                          },
                          { id: "approvalInfo", label: "Approval Info" },
                        ].map((col) => {
                          const isHidden = !!hiddenColumns[col.id];
                          return (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => toggleColumnHide(col.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                                !isHidden
                                  ? "bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100"
                                  : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 line-through"
                              }`}
                            >
                              <span>{col.label}</span>
                              {!isHidden ? (
                                <FiEye size={13} className="text-emerald-500" />
                              ) : (
                                <FiEyeOff
                                  size={13}
                                  className="text-slate-400"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={() => handleAddTask(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[12px] font-black cursor-pointer transition-all shadow-md shrink-0"
              >
                <FiPlus size={14} className="stroke-[3]" />
                <span>Add Task</span>
              </button>
            </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="min-h-[400px]">
          <DragDropContext onDragEnd={handleDragEnd}>
            {(() => {
              const showSelectionColumn = Object.values(
                selectionModeSections,
              ).some(Boolean);

              const visibleColsAfterTaskName = [
                !hiddenColumns.contentCopy,
                !hiddenColumns.client,
                !hiddenColumns.createdBy,
                !hiddenColumns.startDate,
                !hiddenColumns.endDate,
                !hiddenColumns.assignee,
                !hiddenColumns.contentType,
                !hiddenColumns.priority,
                !hiddenColumns.status,
                !hiddenColumns.revision,
                !hiddenColumns.totalHours,
                !hiddenColumns.approvalInfo,
                true, // Actions column is always visible
              ].filter(Boolean).length;

              const totalVisibleColumns =
                (showSelectionColumn ? 1 : 0) + 3 + visibleColsAfterTaskName;

              const renderInlineCreateRow = (sectionName, sColor = null) => {
                const isTaskInputActive =
                  inlineAddingTaskSection === sectionName;
                const isSectionInputActive =
                  inlineAddingSectionUnder === sectionName;
                const rowBg =
                  "bg-white dark:bg-[#111115] hover:bg-slate-50/50 dark:hover:bg-white/[0.02]";
                const bBottom = sColor
                  ? { borderBottom: `2.5px solid ${sColor.hex}` }
                  : {};
                const bLeft = sColor
                  ? { borderLeft: `2.5px solid ${sColor.hex}` }
                  : {};
                const bRight = sColor
                  ? { borderRight: `2.5px solid ${sColor.hex}` }
                  : {};
                return (
                  <tr
                    className={`border-b border-slate-300 dark:border-slate-700 ${rowBg}`}
                  >
                    {showSelectionColumn && (
                      <td
                        className="px-3 py-1 border-b border-slate-300 dark:border-slate-700 w-10 md:sticky md:left-0 z-10 bg-transparent"
                        style={{
                          width: "40px",
                          minWidth: "40px",
                          maxWidth: "40px",
                          ...bBottom,
                          ...bLeft,
                        }}
                      />
                    )}
                    {/* Chevron column spacer */}
                    <td
                      className="px-3 py-1 border-b border-slate-300 dark:border-slate-700 md:sticky z-10 bg-transparent"
                      style={{
                        left: showSelectionColumn ? "40px" : "0px",
                        width: "40px",
                        minWidth: "40px",
                        maxWidth: "40px",
                        ...bBottom,
                        ...(!showSelectionColumn ? bLeft : {}),
                      }}
                    />
                    {/* ID column spacer */}
                    <td
                      className="px-3 py-1 border-b border-slate-300 dark:border-slate-700 md:sticky z-10"
                      style={{
                        left: showSelectionColumn ? "80px" : "40px",
                        backgroundColor: "inherit",
                        minWidth: "60px",
                        maxWidth: "60px",
                        width: "60px",
                        ...bBottom,
                      }}
                    />
                    <td
                      className="px-3 py-1 border-b border-slate-300 dark:border-slate-700 md:sticky z-10 min-w-[250px] md:min-w-[400px]"
                      style={{
                        left: showSelectionColumn ? "140px" : "100px",
                        backgroundColor: "inherit",
                        ...bBottom,
                      }}
                    >
                      <div className="flex items-center gap-2 w-full pl-6">
                        {isTaskInputActive ? (
                          <form
                            onSubmit={(e) =>
                              handleInlineAddTaskSubmit(e, sectionName)
                            }
                            className="w-full"
                          >
                            <input
                              ref={inlineTaskInputRef}
                              type="text"
                              placeholder="Type task name and press Enter..."
                              value={inlineTaskTitle}
                              onChange={(e) =>
                                setInlineTaskTitle(e.target.value)
                              }
                              onBlur={() => {
                                setTimeout(() => {
                                  if (inlineTaskTitle.trim()) {
                                    handleInlineAddTaskSubmit(
                                      { preventDefault: () => {} },
                                      sectionName,
                                    );
                                  } else {
                                    setInlineAddingTaskSection(null);
                                  }
                                }, 150);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setInlineTaskTitle("");
                                  setInlineAddingTaskSection(null);
                                }
                              }}
                              className="w-full bg-transparent text-[11px] font-semibold text-slate-800 dark:text-white outline-none border-b-2 border-blue-500 dark:border-[#3b82f6] pb-1 placeholder-slate-450 dark:placeholder-slate-550 transition-all focus:border-blue-600 dark:focus:border-blue-400"
                            />
                          </form>
                        ) : isSectionInputActive ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleInlineAddSection(inlineSectionName);
                              setInlineSectionName("");
                              setInlineAddingSectionUnder(null);
                            }}
                            className="w-full"
                          >
                            <input
                              ref={inlineSectionInputRef}
                              type="text"
                              placeholder="Add Task List (Type section name & Enter)..."
                              value={inlineSectionName}
                              onChange={(e) =>
                                setInlineSectionName(e.target.value)
                              }
                              onBlur={() => {
                                setTimeout(() => {
                                  if (inlineSectionName.trim()) {
                                    handleInlineAddSection(inlineSectionName);
                                    setInlineSectionName("");
                                    setInlineAddingSectionUnder(null);
                                  } else {
                                    setInlineAddingSectionUnder(null);
                                  }
                                }, 150);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setInlineSectionName("");
                                  setInlineAddingSectionUnder(null);
                                }
                              }}
                              className="w-full bg-transparent text-[10px] font-semibold text-slate-800 dark:text-white outline-none border-b-2 border-indigo-500 dark:border-indigo-400 pb-0.5 placeholder-slate-450 dark:placeholder-slate-555 transition-all focus:border-indigo-650"
                            />
                          </form>
                        ) : (
                          <div className="flex items-center gap-2 text-[12px] font-bold text-slate-450 dark:text-slate-400 select-none">
                            <button
                              type="button"
                              onClick={() => {
                                setInlineAddingTaskSection(sectionName);
                                setInlineAddingSectionUnder(null);
                                setInlineTaskTitle("");
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-955/30 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-[#3b82f6] transition-all cursor-pointer font-bold"
                            >
                              <FiPlus size={12} className="stroke-[3]" />
                              <span>Add Task</span>
                            </button>
                            <span className="mx-1.5 text-slate-350 dark:text-slate-705">
                              |
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineAddingSectionUnder(sectionName);
                                setInlineAddingTaskSection(null);
                                setInlineSectionName("");
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-955/30 text-slate-500 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 transition-all cursor-pointer font-bold"
                            >
                              <FiPlus size={12} className="stroke-[3]" />
                              <span>Add Task List</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td
                      colSpan={visibleColsAfterTaskName}
                      className="px-3 py-1 border-b border-slate-300 dark:border-slate-700 bg-transparent"
                      style={{
                        backgroundColor: "inherit",
                        ...bBottom,
                        ...bRight,
                      }}
                    />
                  </tr>
                );
              };

              return (
                <div className="pt-3 w-full">
                  {/* Mobile Horizontal Scroll Indicator Cue */}
                  <div className="flex md:hidden items-center justify-between gap-1.5 py-1.5 px-3 mb-2 rounded-lg bg-indigo-50/50 dark:bg-white/[0.02] border border-indigo-100/30 dark:border-white/5 text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-[#3b82f6] animate-pulse" />
                      <span>Scroll horizontally to view columns</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-80">
                      <span>← Swipe</span>
                      <svg
                        className="w-2.5 h-2.5 animate-bounce-horizontal"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                  </div>

                  <div
                    className="overflow-x-auto overflow-y-auto h-[calc(100vh-220px)] min-h-[400px] w-full bg-white dark:bg-[#111115] border border-slate-200 dark:border-slate-800 rounded-xl relative scrollbar-thin"
                    onWheel={(e) => {
                      if (e.target.closest(".md\\:sticky")) {
                        // Let native vertical scroll happen when hovering the sticky left area
                        return;
                      }
                      if (e.deltaY !== 0 && !e.shiftKey) {
                        e.currentTarget.scrollLeft += e.deltaY;
                      }
                    }}
                  >
                    <StrictModeDroppable
                      droppableId="sections-list"
                      type="SECTION"
                    >
                      {(provided) => (
                        <table
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="w-full text-left border-collapse text-[11px] "
                        >
                          <thead>
                            <tr className="bg-slate-50 dark:bg-[#16161b] text-slate-700 dark:text-slate-300 tracking-wider text-[12px]">
                              {showSelectionColumn && (
                                <th
                                  className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 text-center w-10 md:sticky md:left-0 z-40 bg-slate-50 dark:bg-[#16161b]"
                                  style={{
                                    width: "40px",
                                    minWidth: "40px",
                                    maxWidth: "40px",
                                  }}
                                >
                                  {/* Selection column header */}
                                </th>
                              )}
                              <th
                                className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 text-center whitespace-nowrap md:sticky z-40 bg-slate-50 dark:bg-[#16161b]"
                                style={{
                                  left: showSelectionColumn ? "40px" : "0px",
                                  width: "60px",
                                  minWidth: "60px",
                                  maxWidth: "60px",
                                }}
                              >
                                <div className="flex justify-center items-center">
                                  <button
                                    type="button"
                                    onClick={toggleAllSections}
                                    className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 transition-colors flex items-center justify-center p-0.5 rounded cursor-pointer"
                                    title="Toggle all sections"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      className={`w-3.5 h-3.5 text-slate-550 transition-transform duration-200 ${(activeProject?.sections?.length > 0 ? activeProject.sections : ["General"]).every((sec) => collapsedSections[sec]) ? "" : "rotate-90"}`}
                                      fill="currentColor"
                                    >
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </button>
                                </div>
                              </th>
                              <th
                                className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[60px] max-w-[60px] w-[60px] md:sticky z-40 bg-slate-50 dark:bg-[#16161b]"
                                style={{
                                  left: showSelectionColumn ? "100px" : "60px",
                                }}
                              >
                                ID
                              </th>
                              <th
                                className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[250px] md:min-w-[80px] md:sticky z-40 bg-slate-50 dark:bg-[#16161b]"
                                style={{
                                  left: showSelectionColumn ? "160px" : "120px",
                                }}
                              >
                                Task Name
                              </th>
                              {/* Content Copy Column */}
                              {!hiddenColumns.contentCopy && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[250px] md:min-w-[350px] w-auto group relative">
                                  <div className="flex items-center justify-between gap-2">
                                    <span>Content Copy</span>
                                    <div className="relative col-header-menu">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenColMenu(
                                            openColMenu === "contentCopy"
                                              ? null
                                              : "contentCopy",
                                          );
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-70 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
                                        title="Column options"
                                      >
                                        <FiMoreVertical size={13} />
                                      </button>
                                      {openColMenu === "contentCopy" && (
                                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 px-1 z-50 min-w-[130px] font-normal text-left">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleColumnHide("contentCopy");
                                              setOpenColMenu(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                          >
                                            <FiEyeOff
                                              size={13}
                                              className="text-slate-400"
                                            />
                                            <span>Hide Column</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </th>
                              )}
                              {/* Client Column */}
                              {!hiddenColumns.client && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[120px]">
                                  Client
                                </th>
                              )}
                              {/* Created By Column */}
                              {!hiddenColumns.createdBy && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[100px]">
                                  Owner
                                </th>
                              )}
                              {/* Start Date Column */}
                              {!hiddenColumns.startDate && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[90px]">
                                  Start Date
                                </th>
                              )}
                              {/* End Date Column */}
                              {!hiddenColumns.endDate && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[90px]">
                                  End Date
                                </th>
                              )}
                              {/* Assignee Column */}
                              {!hiddenColumns.assignee && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[150px]">
                                  Assignee
                                </th>
                              )}
                              {/* Content Type Column */}
                              {!hiddenColumns.contentType && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[160px] w-[180px]">
                                  Content Type
                                </th>
                              )}

                              {/* Priority Column */}
                              {!hiddenColumns.priority && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[120px]">
                                  Priority
                                </th>
                              )}
                              {/* Status Column */}
                              {!hiddenColumns.status && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[120px]">
                                  Status
                                </th>
                              )}
                              {/* Revision Column */}
                              {!hiddenColumns.revision && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[100px] group relative">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span>Revision</span>
                                    <div className="relative col-header-menu">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenColMenu(
                                            openColMenu === "revision"
                                              ? null
                                              : "revision",
                                          );
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-70 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
                                        title="Column options"
                                      >
                                        <FiMoreVertical size={13} />
                                      </button>
                                      {openColMenu === "revision" && (
                                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 px-1 z-50 min-w-[130px] font-normal text-left">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleColumnHide("revision");
                                              setOpenColMenu(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                          >
                                            <FiEyeOff
                                              size={13}
                                              className="text-slate-400"
                                            />
                                            <span>Hide Column</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </th>
                              )}
                              {!hiddenColumns.approvalInfo && (
                                <th className="px-3 py-1 border-b border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[200px]">
                                  Approval Info
                                </th>
                              )}
                              <th className="px-3 py-1 border-b border-slate-300 dark:border-slate-700 text-center whitespace-nowrap min-w-[80px]">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          {(() => {
                            const projectSections =
                              activeProject.sections || [];
                            const taskSections = sortedTasks.map(
                              (t) => t.section || "General",
                            );
                            const rawSections = [
                              ...projectSections,
                              ...taskSections,
                            ];
                            const sectionsToRender = Array.from(
                              new Set(
                                rawSections.length > 0
                                  ? rawSections
                                  : ["General"],
                              ),
                            );
                            const hasNoSectionsAndNoTasks =
                              sectionsToRender.length === 0 &&
                              sortedTasks.length === 0;
                            if (hasNoSectionsAndNoTasks) {
                              return (
                                <tbody className="text-[11px]">
                                  {renderInlineCreateRow("__root__")}
                                </tbody>
                              );
                            }
                            return sectionsToRender.map(
                              (sectionName, sectionIndex) => {
                                const sectionTasks = sortedTasks
                                  .filter(
                                    (t) =>
                                      t.section === sectionName ||
                                      (!t.section && sectionName === "General"),
                                  )
                                  .sort((a, b) => {
                                    const dateA = new Date(a.createdAt || 0);
                                    const dateB = new Date(b.createdAt || 0);
                                    return dateA - dateB; // Sort ascending (one by one)
                                  });
                                const isSectionCollapsed =
                                  !!collapsedSections[sectionName];

                                const sectionColors = [
                                  {
                                    hex: "#6366f1",
                                    borderClass:
                                      "border-indigo-500 dark:border-indigo-400",
                                  }, // Indigo
                                  {
                                    hex: "#0ea5e9",
                                    borderClass:
                                      "border-sky-500 dark:border-sky-400",
                                  }, // Sky
                                  {
                                    hex: "#10b981",
                                    borderClass:
                                      "border-emerald-500 dark:border-emerald-400",
                                  }, // Emerald
                                  {
                                    hex: "#f59e0b",
                                    borderClass:
                                      "border-amber-500 dark:border-amber-400",
                                  }, // Amber
                                  {
                                    hex: "#f43f5e",
                                    borderClass:
                                      "border-rose-500 dark:border-rose-400",
                                  }, // Rose
                                  {
                                    hex: "#a855f7",
                                    borderClass:
                                      "border-purple-500 dark:border-purple-400",
                                  }, // Purple
                                ];
                                const sColor =
                                  sectionColors[
                                    sectionIndex % sectionColors.length
                                  ];

                                return (
                                  <Draggable
                                    key={sectionName}
                                    draggableId={sectionName}
                                    index={sectionIndex}
                                  >
                                    {(provided) => (
                                      <tbody
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="text-[11px]"
                                      >
                                        {sectionIndex > 0 && (
                                          <tr className="pointer-events-none select-none">
                                            <td
                                              colSpan={totalVisibleColumns}
                                              style={{
                                                height: "20px",
                                                padding: 0,
                                                border: "none",
                                                backgroundColor: "transparent",
                                              }}
                                            />
                                          </tr>
                                        )}
                                        {/* SECTION HEADER ROW */}
                                        <tr
                                          className={`theme-bg-accent-ultrasubtle  border-b border-slate-300 dark:border-slate-700 select-none group/secrow transition-colors ${
                                            openSectionMenu === sectionName
                                              ? "relative z-50"
                                              : ""
                                          }`}
                                        >
                                          {showSelectionColumn && (
                                            <td
                                              className={`px-3 py-1 border-r border-b border-slate-300 dark:border-slate-700 text-center w-10 md:sticky md:left-0 sidebar-bg  relative ${
                                                openSectionMenu === sectionName
                                                  ? "z-50"
                                                  : "z-30"
                                              }`}
                                              style={{
                                                width: "40px",
                                                minWidth: "40px",
                                                maxWidth: "40px",
                                                borderLeft: `2.5px solid ${sColor.hex}`,
                                              }}
                                            >
                                              {selectionModeSections[
                                                sectionName
                                              ] && (
                                                <input
                                                  type="checkbox"
                                                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                  checked={
                                                    sectionTasks.length > 0 &&
                                                    sectionTasks.every(
                                                      (t) =>
                                                        selectedTasks[t._id],
                                                    )
                                                  }
                                                  onChange={(e) => {
                                                    const checked =
                                                      e.target.checked;
                                                    setSelectedTasks((prev) => {
                                                      const next = { ...prev };
                                                      sectionTasks.forEach(
                                                        (t) => {
                                                          next[t._id] = checked;
                                                        },
                                                      );
                                                      return next;
                                                    });
                                                  }}
                                                />
                                              )}
                                            </td>
                                          )}
                                          {/* Chevron + 3-dots Column */}
                                          <td
                                            className={`px-2 py-1 border-r border-b border-slate-300 dark:border-slate-700 md:sticky sidebar-bg relative ${
                                              openSectionMenu === sectionName
                                                ? "z-50"
                                                : "z-30"
                                            }`}
                                            style={{
                                              left: showSelectionColumn
                                                ? "40px"
                                                : "0px",
                                              width: "60px",
                                              minWidth: "60px",
                                              maxWidth: "60px",
                                              borderLeft: !showSelectionColumn
                                                ? `2.5px solid ${sColor.hex}`
                                                : undefined,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="flex items-center justify-center gap-1">
                                              {/* Collapse toggle */}
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  toggleSection(sectionName)
                                                }
                                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center justify-center p-0.5 rounded cursor-pointer"
                                              >
                                                <svg
                                                  viewBox="0 0 24 24"
                                                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isSectionCollapsed ? "" : "rotate-90"}`}
                                                  fill="currentColor"
                                                >
                                                  <path d="M8 5v14l11-7z" />
                                                </svg>
                                              </button>
                                              {/* 3-dots menu */}
                                              {isAdminOrManager && (
                                                <div className="relative section-menu-container">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setOpenSectionMenu(
                                                        openSectionMenu ===
                                                          sectionName
                                                          ? null
                                                          : sectionName,
                                                      );
                                                    }}
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center justify-center p-0.5 rounded cursor-pointer"
                                                  >
                                                    <FiMoreHorizontal
                                                      size={13}
                                                    />
                                                  </button>
                                                  {openSectionMenu ===
                                                    sectionName && (
                                                    <div
                                                      className="absolute left-0 top-full mt-1.5 w-48 bg-white dark:bg-[#151518] border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-2 z-[60] flex flex-col gap-1.5"
                                                      onClick={(e) =>
                                                        e.stopPropagation()
                                                      }
                                                    >
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setSelectionModeSections(
                                                            (prev) => ({
                                                              ...prev,
                                                              [sectionName]:
                                                                !prev[
                                                                  sectionName
                                                                ],
                                                            }),
                                                          );
                                                          if (
                                                            selectionModeSections[
                                                              sectionName
                                                            ]
                                                          ) {
                                                            setSelectedTasks(
                                                              (prev) => {
                                                                const next = {
                                                                  ...prev,
                                                                };
                                                                sectionTasks.forEach(
                                                                  (t) => {
                                                                    delete next[
                                                                      t._id
                                                                    ];
                                                                  },
                                                                );
                                                                return next;
                                                              },
                                                            );
                                                          }
                                                          setOpenSectionMenu(
                                                            null,
                                                          );
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-2 w-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-[#334155] text-slate-700 dark:text-slate-200 rounded-lg transition-all"
                                                      >
                                                        {selectionModeSections[
                                                          sectionName
                                                        ] ? (
                                                          <>
                                                            <FiX size={13} />{" "}
                                                            Cancel Select
                                                          </>
                                                        ) : (
                                                          <>
                                                            <FiCheckCircle
                                                              size={13}
                                                            />{" "}
                                                            Select Tasks
                                                          </>
                                                        )}
                                                      </button>
                                                      {sectionName !==
                                                        "General" && (
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            handleDeleteSection(
                                                              sectionName,
                                                            );
                                                            setOpenSectionMenu(
                                                              null,
                                                            );
                                                          }}
                                                          className="flex items-center gap-2 px-3 py-2 w-full text-[11px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition-all"
                                                        >
                                                          <FiTrash2 size={13} />{" "}
                                                          Delete Section
                                                        </button>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          {/* ID Column */}
                                          <td
                                            className="px-3 py-1 border-r border-b border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[60px] max-w-[60px] w-[60px] md:sticky z-30 sidebar-bg"
                                            style={{
                                              left: showSelectionColumn
                                                ? "80px"
                                                : "40px",
                                            }}
                                          />
                                          {/* Task Name Column */}
                                          <td
                                            className="px-3 py-1 border-r border-b border-slate-300 dark:border-slate-700 md:sticky z-30 sidebar-bg"
                                            style={{
                                              left: showSelectionColumn
                                                ? "140px"
                                                : "100px",
                                              minWidth: "250px",
                                            }}
                                          >
                                            <div className="flex items-center gap-2.5 w-full">
                                              {/* Drag Handle */}
                                              <div
                                                {...provided.dragHandleProps}
                                                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-655 dark:hover:text-slate-205 transition-colors flex items-center justify-center shrink-0"
                                                title="Drag to reorder section"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <svg
                                                  viewBox="0 0 24 24"
                                                  className="w-3.5 h-3.5"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2.5"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                >
                                                  <circle
                                                    cx="9"
                                                    cy="12"
                                                    r="1.5"
                                                    fill="currentColor"
                                                  />
                                                  <circle
                                                    cx="9"
                                                    cy="6"
                                                    r="1.5"
                                                    fill="currentColor"
                                                  />
                                                  <circle
                                                    cx="9"
                                                    cy="18"
                                                    r="1.5"
                                                    fill="currentColor"
                                                  />
                                                  <circle
                                                    cx="15"
                                                    cy="12"
                                                    r="1.5"
                                                    fill="currentColor"
                                                  />
                                                  <circle
                                                    cx="15"
                                                    cy="6"
                                                    r="1.5"
                                                    fill="currentColor"
                                                  />
                                                  <circle
                                                    cx="15"
                                                    cy="18"
                                                    r="1.5"
                                                    fill="currentColor"
                                                  />
                                                </svg>
                                              </div>

                                              {/* Inline Editable Section Name Input */}
                                              <input
                                                id={`section-input-${sectionName}`}
                                                type="text"
                                                defaultValue={sectionName}
                                                onBlur={async (e) => {
                                                  const newName =
                                                    e.target.value.trim();
                                                  if (
                                                    !newName ||
                                                    newName === sectionName
                                                  ) {
                                                    e.target.value =
                                                      sectionName; // revert back
                                                    return;
                                                  }

                                                  try {
                                                    const currentSections =
                                                      activeProject.sections
                                                        ?.length > 0
                                                        ? activeProject.sections
                                                        : ["General"];
                                                    const updatedSections =
                                                      currentSections.map(
                                                        (s) =>
                                                          s === sectionName
                                                            ? newName
                                                            : s,
                                                      );

                                                    await dispatch(
                                                      updateProject({
                                                        id: activeProjectId,
                                                        data: {
                                                          sections:
                                                            updatedSections,
                                                        },
                                                      }),
                                                    ).unwrap();

                                                    const tasksToUpdate =
                                                      tasks.filter(
                                                        (t) =>
                                                          t.section ===
                                                            sectionName ||
                                                          (!t.section &&
                                                            sectionName ===
                                                              "General"),
                                                      );
                                                    await Promise.all(
                                                      tasksToUpdate.map((t) =>
                                                        updateTaskMutation({
                                                          id: t._id,
                                                          taskData: {
                                                            section: newName,
                                                          },
                                                        }).unwrap(),
                                                      ),
                                                    );

                                                    toast.success(
                                                      "Section renamed successfully",
                                                    );
                                                  } catch (err) {
                                                    console.error(
                                                      "Failed to rename section:",
                                                      err,
                                                    );
                                                    toast.error(
                                                      "Failed to rename section",
                                                    );
                                                    e.target.value =
                                                      sectionName; // revert back
                                                  }
                                                }}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    e.target.blur();
                                                  }
                                                }}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="font-bold text-[10px] uppercase tracking-wider text-slate-705 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1.5 py-0.5 outline-none bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500 flex-1 border-none cursor-text truncate transition-all"
                                              />

                                              <span className="bg-blue-100/60 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200/40 dark:border-blue-800/30 font-bold px-2 py-0.5 rounded-full text-[10px] select-none">
                                                {sectionTasks.length}
                                              </span>

                                              {/* Add Task Plus Icon next to section name */}
                                              {isAdminOrManager && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddTask(sectionName);
                                                  }}
                                                  title="Add Task to this Section"
                                                  className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-white/5 dark:hover:bg-white/10 text-blue-600 dark:text-[#3b82f6] hover:scale-110 active:scale-90 transition-all cursor-pointer border border-blue-100/50 dark:border-white/5"
                                                >
                                                  <FiPlus
                                                    size={11}
                                                    className="stroke-[3]"
                                                  />
                                                </button>
                                              )}

                                              {/* Bulk Actions Inline */}
                                              {isAdminOrManager &&
                                                selectionModeSections[
                                                  sectionName
                                                ] && (
                                                  <div className="flex items-center gap-2 ml-3">
                                                    {/* Cancel Select */}
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectionModeSections(
                                                          (prev) => ({
                                                            ...prev,
                                                            [sectionName]: false,
                                                          }),
                                                        );
                                                        setSelectedTasks(
                                                          (prev) => {
                                                            const next = {
                                                              ...prev,
                                                            };
                                                            sectionTasks.forEach(
                                                              (t) => {
                                                                delete next[
                                                                  t._id
                                                                ];
                                                              },
                                                            );
                                                            return next;
                                                          },
                                                        );
                                                      }}
                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                                                    >
                                                      <FiX
                                                        size={11}
                                                        className="shrink-0"
                                                      />
                                                      Cancel Select
                                                    </button>
                                                    {/* Delete Selected */}
                                                    {Object.keys(
                                                      selectedTasks,
                                                    ).some(
                                                      (id) =>
                                                        selectedTasks[id] &&
                                                        sectionTasks.some(
                                                          (t) => t._id === id,
                                                        ),
                                                    ) && (
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleBulkDelete(
                                                            sectionTasks,
                                                            sectionName,
                                                          );
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500 text-white border border-rose-600 dark:border-rose-500 transition-all cursor-pointer shadow-sm whitespace-nowrap"
                                                      >
                                                        <FiTrash2
                                                          size={11}
                                                          className="shrink-0"
                                                        />
                                                        Delete Selected (
                                                        {
                                                          Object.keys(
                                                            selectedTasks,
                                                          ).filter(
                                                            (id) =>
                                                              selectedTasks[
                                                                id
                                                              ] &&
                                                              sectionTasks.some(
                                                                (t) =>
                                                                  t._id === id,
                                                              ),
                                                          ).length
                                                        }
                                                        )
                                                      </button>
                                                    )}
                                                  </div>
                                                )}
                                            </div>
                                          </td>
                                          {/* Empty Column Cells merged into one to remove vertical gridlines */}
                                          <td
                                            colSpan={visibleColsAfterTaskName}
                                            className="px-3 py-1 border-b border-slate-300 dark:border-slate-700 sidebar-bg"
                                            style={{
                                              borderRight: `2.5px solid ${sColor.hex}`,
                                            }}
                                          />
                                        </tr>

                                        {/* SECTION TASKS */}
                                        {!isSectionCollapsed && (
                                          <>
                                            {sectionTasks.map(
                                              (task, taskIndex) => {
                                                const isExpanded =
                                                  !!expandedTasks[task._id];
                                                const isCompleted =
                                                  task.status === "Completed";
                                                const canToggle =
                                                  isAdminOrManager ||
                                                  task.assignedTo?._id ===
                                                    currentUser?._id ||
                                                  task.assignedTo ===
                                                    currentUser?._id;

                                                const isSelected =
                                                  selectedTaskId === task._id;
                                                const isRejected =
                                                  task.status === "Rejected";
                                                const isInReview =
                                                  task.status === "In Review";
                                                const isInProgress =
                                                  task.status === "In Progress";
                                                const rowBg = isSelected
                                                  ? "bg-blue-50 dark:bg-[#1e293b]"
                                                  : isRejected
                                                    ? "!bg-[#fde8e8] text-rose-950 dark:!bg-[#2c1214] dark:text-rose-200 opacity-80 pointer-events-none !border-rose-300 dark:!border-rose-800/60"
                                                    : taskIndex % 2 === 0
                                                      ? "bg-white dark:bg-[#111115] text-slate-800 dark:text-slate-100"
                                                      : "bg-slate-50 dark:bg-[#16161b] text-slate-800 dark:text-slate-100";

                                                return (
                                                  <React.Fragment
                                                    key={task._id}
                                                  >
                                                    {/* Parent Task Row */}
                                                    <tr
                                                      id={`task-row-${task._id}`}
                                                      onClick={() =>
                                                        setSelectedTaskId(
                                                          task._id,
                                                        )
                                                      }
                                                      className={`group cursor-pointer transition-colors ${
                                                        highlightedTaskId ===
                                                        task._id
                                                          ? "bg-indigo-100/80 dark:bg-indigo-900/40"
                                                          : rowBg
                                                      } ${
                                                        task.priority ===
                                                          "Top High" &&
                                                        task.status !==
                                                          "Completed"
                                                          ? "row-priority-top-high"
                                                          : ""
                                                      }`}
                                                    >
                                                      {showSelectionColumn && (
                                                        <td
                                                          onClick={(e) =>
                                                            e.stopPropagation()
                                                          }
                                                          className={`px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 text-center w-10 md:sticky md:left-0 z-30 ${rowBg}`}
                                                          style={{
                                                            width: "40px",
                                                            minWidth: "40px",
                                                            maxWidth: "40px",
                                                            borderLeft: `2.5px solid ${sColor.hex}`,
                                                          }}
                                                        >
                                                          {selectionModeSections[
                                                            sectionName
                                                          ] && (
                                                            <input
                                                              type="checkbox"
                                                              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                              checked={
                                                                !!selectedTasks[
                                                                  task._id
                                                                ]
                                                              }
                                                              onChange={(e) => {
                                                                const checked =
                                                                  e.target
                                                                    .checked;
                                                                setSelectedTasks(
                                                                  (prev) => ({
                                                                    ...prev,
                                                                    [task._id]:
                                                                      checked,
                                                                  }),
                                                                );
                                                              }}
                                                            />
                                                          )}
                                                        </td>
                                                      )}
                                                      {/* Dropdown Chevron Column */}
                                                      <td
                                                        className={`px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 text-center w-10 md:sticky z-30 ${rowBg}`}
                                                        style={{
                                                          left: showSelectionColumn
                                                            ? "40px"
                                                            : "0px",
                                                          width: "40px",
                                                          minWidth: "40px",
                                                          maxWidth: "40px",
                                                          borderLeft:
                                                            !showSelectionColumn
                                                              ? `2.5px solid ${sColor.hex}`
                                                              : undefined,
                                                        }}
                                                      >
                                                        <div className="flex items-center justify-center">
                                                          {task.subtasks
                                                            ?.length > 0 && (
                                                            <button
                                                              type="button"
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTaskExpanded(
                                                                  task._id,
                                                                );
                                                              }}
                                                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded shrink-0 cursor-pointer"
                                                              title={
                                                                isExpanded
                                                                  ? "Collapse Subtasks"
                                                                  : "Expand Subtasks"
                                                              }
                                                            >
                                                              <svg
                                                                viewBox="0 0 24 24"
                                                                className={`w-3.5 h-3.5 text-slate-550 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                                                fill="currentColor"
                                                              >
                                                                <path d="M8 5v14l11-7z" />
                                                              </svg>
                                                            </button>
                                                          )}
                                                        </div>
                                                      </td>
                                                      {/* ID Column */}
                                                      <td
                                                        className={`px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap md:sticky z-30 ${rowBg}`}
                                                        style={{
                                                          left: showSelectionColumn
                                                            ? "80px"
                                                            : "40px",
                                                          minWidth: "60px",
                                                          maxWidth: "60px",
                                                          width: "60px",
                                                        }}
                                                      >
                                                        {getTaskDisplayId(task)}
                                                      </td>
                                                      {/* Name Field with Circle Checkbox */}
                                                      <td
                                                        onClick={(e) =>
                                                          e.stopPropagation()
                                                        }
                                                        className={`px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 font-semibold md:sticky z-30 min-w-[250px] md:min-w-[400px] ${rowBg}`}
                                                        style={{
                                                          left: showSelectionColumn
                                                            ? "140px"
                                                            : "100px",
                                                        }}
                                                      >
                                                        <div className="flex items-center gap-2.5 w-full">
                                                          {/* Circular Complete Checkbox */}
                                                          <button
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              if (canToggle) {
                                                                handleTaskFieldChange(
                                                                  task._id,
                                                                  {
                                                                    status:
                                                                      isCompleted
                                                                        ? "Not Started"
                                                                        : "Completed",
                                                                  },
                                                                );
                                                              }
                                                            }}
                                                            disabled={
                                                              !canToggle
                                                            }
                                                            className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all shrink-0 ${
                                                              !canToggle
                                                                ? "cursor-not-allowed opacity-50"
                                                                : "cursor-pointer"
                                                            } ${
                                                              isCompleted
                                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                                : "border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-[#3b82f6] text-transparent hover:text-slate-400 dark:hover:text-slate-400 dark:hover:text-[#3b82f6]"
                                                            }`}
                                                          >
                                                            <FiCheck size={9} />
                                                          </button>

                                                          {/* Task Title contentEditable Span */}
                                                          <div className="flex-grow min-w-0 flex items-center gap-1.5">
                                                            {highlightedTaskId ===
                                                              task._id && (
                                                              <FiLoader
                                                                size={12}
                                                                className="animate-spin text-indigo-500 dark:text-indigo-400 shrink-0"
                                                              />
                                                            )}
                                                            <span
                                                              ref={(el) => {
                                                                if (
                                                                  el &&
                                                                  focusedTaskId ===
                                                                    task._id
                                                                ) {
                                                                  el.focus();
                                                                  setFocusedTaskId(
                                                                    null,
                                                                  );
                                                                }
                                                              }}
                                                              contentEditable={
                                                                canToggle
                                                              }
                                                              suppressContentEditableWarning={
                                                                true
                                                              }
                                                              placeholder="Write a task here..."
                                                              onBlur={(e) => {
                                                                const val =
                                                                  e.target.innerText.trim();
                                                                if (
                                                                  val !==
                                                                  task.title
                                                                ) {
                                                                  handleTaskFieldChange(
                                                                    task._id,
                                                                    {
                                                                      title:
                                                                        val,
                                                                    },
                                                                  );
                                                                }
                                                              }}
                                                              onKeyDown={(
                                                                e,
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                  "Enter"
                                                                ) {
                                                                  e.preventDefault();
                                                                  e.target.blur();
                                                                  setInlineAddingTaskSection(
                                                                    task.section ||
                                                                      "General",
                                                                  );
                                                                  setInlineTaskTitle(
                                                                    "",
                                                                  );
                                                                }
                                                              }}
                                                              className={`font-semibold text-slate-800 dark:text-white text-[11px] cursor-text outline-none block min-h-[16px] w-full ${
                                                                isCompleted
                                                                  ? "line-through text-slate-450 dark:text-slate-555 font-bold"
                                                                  : ""
                                                              }`}
                                                            >
                                                              {task.title}
                                                            </span>
                                                          </div>

                                                          {/* Subtask Count Badge (static, click opens drawer) */}
                                                          {task.subtasks
                                                            ?.length > 0 && (
                                                            <button
                                                              type="button"
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedTaskId(
                                                                  task._id,
                                                                );
                                                              }}
                                                              title={`${task.subtasks.length} subtask${task.subtasks.length !== 1 ? "s" : ""} — open details`}
                                                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-slate-550 dark:text-slate-400 border border-slate-200 dark:border-white/5 text-[8.5px] font-bold shrink-0 bg-blue-50 bg-[#3b82f6]/10 hover:text-blue-600 dark:hover:text-[#3b82f6] hover:border-blue-200 dark:hover:border-[#3b82f6]/20 transition-all cursor-pointer"
                                                            >
                                                              <FiCornerDownRight
                                                                size={8}
                                                              />
                                                              {
                                                                task.subtasks
                                                                  .length
                                                              }
                                                            </button>
                                                          )}

                                                          {/* Detail Drawer Open Arrow */}
                                                          <button
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setSelectedTaskId(
                                                                task._id,
                                                              );
                                                            }}
                                                            className="ml-auto shrink-0 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-[#3b82f6] p-0.5 rounded hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                            title="Open Task Details"
                                                          >
                                                            <FiChevronRight
                                                              size={14}
                                                            />
                                                          </button>
                                                        </div>
                                                      </td>

                                                      {/* Content Copy */}
                                                      <td
                                                        className={`px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 ${hiddenColumns.contentCopy ? "hidden" : ""}`}
                                                      >
                                                        <div
                                                          onClick={(e) =>
                                                            e.stopPropagation()
                                                          }
                                                          className="w-full"
                                                        >
                                                          <ContentCopyInput
                                                            value={
                                                              task.contentCopy
                                                            }
                                                            onChange={(
                                                              newVal,
                                                            ) =>
                                                              handleTaskFieldChange(
                                                                task._id,
                                                                {
                                                                  contentCopy:
                                                                    newVal,
                                                                },
                                                              )
                                                            }
                                                          />
                                                        </div>
                                                      </td>
                                                      {/* Client Column */}
                                                      {!hiddenColumns.client && (
                                                        <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 font-medium">
                                                          <div
                                                            onClick={(e) =>
                                                              e.stopPropagation()
                                                            }
                                                          >
                                                            {(() => {
                                                              const clientId =
                                                                activeProject
                                                                  ?.client
                                                                  ?._id ||
                                                                activeProject?.client;
                                                              const clientObj =
                                                                clients?.find(
                                                                  (c) =>
                                                                    c._id ===
                                                                    clientId,
                                                                );
                                                              if (!clientObj)
                                                                return (
                                                                  <span className="text-slate-400 text-[10px] italic">
                                                                    No Client
                                                                  </span>
                                                                );
                                                              return (
                                                                <ClientBadge
                                                                  client={
                                                                    clientObj
                                                                  }
                                                                  size="sm"
                                                                />
                                                              );
                                                            })()}
                                                          </div>
                                                        </td>
                                                      )}

                                                      {/* Created By Column */}
                                                      {!hiddenColumns.createdBy && (
                                                        <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                          {task.createdBy ? (
                                                            <div className="flex items-center gap-2">
                                                              {task.createdBy
                                                                .profile
                                                                ?.profileImage
                                                                ?.url ||
                                                              task.createdBy
                                                                .profileImage
                                                                ?.url ||
                                                              task.createdBy
                                                                .profile
                                                                ?.avatar ||
                                                              task.createdBy
                                                                .avatar ? (
                                                                <img
                                                                  src={
                                                                    task
                                                                      .createdBy
                                                                      .profile
                                                                      ?.profileImage
                                                                      ?.url ||
                                                                    task
                                                                      .createdBy
                                                                      .profileImage
                                                                      ?.url ||
                                                                    task
                                                                      .createdBy
                                                                      .profile
                                                                      ?.avatar ||
                                                                    task
                                                                      .createdBy
                                                                      .avatar
                                                                  }
                                                                  alt={
                                                                    task
                                                                      .createdBy
                                                                      .name
                                                                  }
                                                                  className="w-4 h-4 rounded-full object-cover border border-slate-250 dark:border-white/10 shrink-0"
                                                                />
                                                              ) : (
                                                                <div
                                                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[7.5px] font-bold bg-gradient-to-br shrink-0 ${getAvatarColor(
                                                                    task
                                                                      .createdBy
                                                                      .name ||
                                                                      "U",
                                                                  )}`}
                                                                >
                                                                  {getInitials(
                                                                    task
                                                                      .createdBy
                                                                      .name ||
                                                                      "U",
                                                                  )}
                                                                </div>
                                                              )}
                                                              <span
                                                                className="text-[9.5px] font-semibold text-slate-605 dark:text-slate-400 truncate max-w-[85px]"
                                                                title={
                                                                  task.createdBy
                                                                    .name
                                                                }
                                                              >
                                                                {
                                                                  task.createdBy
                                                                    .name
                                                                }
                                                              </span>
                                                            </div>
                                                          ) : (
                                                            <span className="text-slate-400 dark:text-slate-550 text-[9px] font-normal">
                                                              N/A
                                                            </span>
                                                          )}
                                                        </td>
                                                      )}

                                                      {/* Start Date */}
                                                      {!hiddenColumns.startDate && (
                                                        <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                          <div
                                                            className={`relative h-6 flex items-center justify-start transition-all ${
                                                              task.startDate
                                                                ? "cursor-not-allowed"
                                                                : "cursor-pointer"
                                                            }`}
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              if (
                                                                !task.startDate
                                                              ) {
                                                                const input =
                                                                  e.currentTarget.querySelector(
                                                                    'input[type="date"]',
                                                                  );
                                                                if (
                                                                  input &&
                                                                  typeof input.showPicker ===
                                                                    "function"
                                                                ) {
                                                                  input.showPicker();
                                                                }
                                                              }
                                                            }}
                                                          >
                                                            {task.startDate ? (
                                                              <div
                                                                className="flex items-center flex-nowrap gap-1 px-1.5 py-0.5 rounded-md border border-blue-300 dark:border-blue-800/85 text-blue-855 dark:text-blue-300 text-[9.5px] font-bold bg-blue-100 dark:bg-blue-900 transition-all shadow-2xs opacity-90 cursor-not-allowed select-none"
                                                                title="🔒 Start Date — Locked"
                                                              >
                                                                <FiLock
                                                                  size={9.5}
                                                                  className="text-amber-600 dark:text-amber-400 shrink-0"
                                                                />
                                                                <span className="whitespace-nowrap">
                                                                  {new Date(
                                                                    task.startDate,
                                                                  ).toLocaleDateString(
                                                                    undefined,
                                                                    {
                                                                      month:
                                                                        "short",
                                                                      day: "numeric",
                                                                    },
                                                                  )}
                                                                </span>
                                                                <span className="ml-0.5 text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest shrink-0">
                                                                  🔒
                                                                </span>
                                                              </div>
                                                            ) : (
                                                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-blue-600 dark:border-blue-800/80 text-white dark:text-blue-400/90 bg-blue-400 dark:bg-blue-400 transition-all text-[8px] font-bold">
                                                                <FiCalendar
                                                                  size={9.5}
                                                                />
                                                                <span>
                                                                  + Start Date
                                                                </span>
                                                              </div>
                                                            )}
                                                            {isAdminOrManager &&
                                                              !task.startDate && (
                                                                <input
                                                                  type="date"
                                                                  value=""
                                                                  onChange={(
                                                                    e,
                                                                  ) =>
                                                                    handleTaskFieldChange(
                                                                      task._id,
                                                                      {
                                                                        startDate:
                                                                          e
                                                                            .target
                                                                            .value ||
                                                                          null,
                                                                      },
                                                                    )
                                                                  }
                                                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                />
                                                              )}
                                                          </div>
                                                        </td>
                                                      )}

                                                      {/* End Date */}
                                                      {!hiddenColumns.endDate && (
                                                        <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                          <div
                                                            className={`relative h-6 flex items-center justify-start transition-all ${
                                                              task.dueDate
                                                                ? "cursor-not-allowed"
                                                                : "cursor-pointer"
                                                            }`}
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              if (
                                                                !task.dueDate
                                                              ) {
                                                                const input =
                                                                  e.currentTarget.querySelector(
                                                                    'input[type="date"]',
                                                                  );
                                                                if (
                                                                  input &&
                                                                  typeof input.showPicker ===
                                                                    "function"
                                                                ) {
                                                                  input.showPicker();
                                                                }
                                                              }
                                                            }}
                                                          >
                                                            {task.dueDate ? (
                                                              <div
                                                                className="flex items-center flex-nowrap gap-1 px-1.5 py-0.5 rounded-md border border-rose-300 dark:border-rose-700/80 text-rose-855 dark:text-rose-100 text-[9.5px] font-bold bg-rose-100 dark:bg-rose-800 transition-all shadow-2xs opacity-90 cursor-not-allowed select-none"
                                                                title="🔒 End Date — Locked"
                                                              >
                                                                <FiLock
                                                                  size={9.5}
                                                                  className="text-amber-600 dark:text-amber-400 shrink-0"
                                                                />
                                                                <span className="whitespace-nowrap">
                                                                  {new Date(
                                                                    task.dueDate,
                                                                  ).toLocaleDateString(
                                                                    undefined,
                                                                    {
                                                                      month:
                                                                        "short",
                                                                      day: "numeric",
                                                                    },
                                                                  )}
                                                                </span>
                                                                <span className="ml-0.5 text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest shrink-0">
                                                                  🔒
                                                                </span>
                                                              </div>
                                                            ) : (
                                                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-rose-300 dark:border-rose-800/80 text-rose-605 dark:text-rose-400/90 hover:border-rose-400 hover:text-rose-750 dark:hover:text-rose-300 dark:hover:border-rose-600/85 bg-rose-50/50 dark:bg-rose-955/20 hover:bg-rose-100 dark:hover:bg-rose-955/50 transition-all text-[8px] font-bold">
                                                                <FiCalendar
                                                                  size={9.5}
                                                                />
                                                                <span>
                                                                  + End Date
                                                                </span>
                                                              </div>
                                                            )}
                                                            {isAdminOrManager &&
                                                              !task.dueDate && (
                                                                <input
                                                                  type="date"
                                                                  value=""
                                                                  min={
                                                                    task.startDate
                                                                      ? new Date(
                                                                          task.startDate,
                                                                        )
                                                                          .toISOString()
                                                                          .split(
                                                                            "T",
                                                                          )[0]
                                                                      : ""
                                                                  }
                                                                  onChange={(
                                                                    e,
                                                                  ) =>
                                                                    handleTaskFieldChange(
                                                                      task._id,
                                                                      {
                                                                        dueDate:
                                                                          e
                                                                            .target
                                                                            .value ||
                                                                          null,
                                                                      },
                                                                    )
                                                                  }
                                                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                />
                                                              )}
                                                          </div>
                                                        </td>
                                                      )}

                                                      {/* Assignee Selection */}
                                                      {!hiddenColumns.assignee && (
                                                        <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                          <div
                                                            className="flex items-center gap-1.5"
                                                            onClick={(e) =>
                                                              e.stopPropagation()
                                                            }
                                                          >
                                                            <AssigneeDropdown
                                                              selectedUser={
                                                                task.contentType ===
                                                                "MOM"
                                                                  ? task.assignedTo ||
                                                                    task
                                                                      .createdBy
                                                                      ?._id ||
                                                                    task
                                                                      .createdBy
                                                                      ?.id ||
                                                                    task.createdBy ||
                                                                    currentUser?._id ||
                                                                    currentUser?.id
                                                                  : task.assignedTo
                                                              }
                                                              users={users}
                                                              onChange={(userId) => {
                                                                if (!task.title || task.title.trim() === "") {
                                                                  toast.error("Please fill the task name first");
                                                                  return;
                                                                }
                                                                handleTaskFieldChange(task._id, {
                                                                  assignedTo: userId,
                                                                });
                                                              }}
                                                              isAdminOrManager={
                                                                isAdminOrManager
                                                              }
                                                              disabled={
                                                                task.contentType ===
                                                                "MOM"
                                                              }
                                                              isLocked={
                                                                task.contentType ===
                                                                "MOM"
                                                              }
                                                              isMOM={
                                                                task.contentType ===
                                                                "MOM"
                                                              }
                                                              currentUser={
                                                                currentUser
                                                              }
                                                              getAvatarColor={
                                                                getAvatarColor
                                                              }
                                                              size="md"
                                                            />
                                                          </div>
                                                        </td>
                                                      )}

                                                      {/* Content Type Column */}
                                                      {!hiddenColumns.contentType && (
                                                        <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 min-w-[160px] w-[180px]">
                                                          <div
                                                            onClick={(e) =>
                                                              e.stopPropagation()
                                                            }
                                                          >
                                                            {isAdminOrManager ? (
                                                              <select
                                                                value={
                                                                  task.contentType ||
                                                                  ""
                                                                }
                                                                onChange={(
                                                                  e,
                                                                ) => {
                                                                  const val =
                                                                    e.target
                                                                      .value;
                                                                  if (
                                                                    val ===
                                                                    "__ADD_CUSTOM__"
                                                                  ) {
                                                                    const customVal =
                                                                      prompt(
                                                                        "Enter custom content type:",
                                                                      );
                                                                    if (
                                                                      customVal &&
                                                                      customVal.trim() !==
                                                                        ""
                                                                    ) {
                                                                      const creatorId =
                                                                        task
                                                                          .createdBy
                                                                          ?._id ||
                                                                        task
                                                                          .createdBy
                                                                          ?.id ||
                                                                        (typeof task.createdBy ===
                                                                        "string"
                                                                          ? task.createdBy
                                                                          : null) ||
                                                                        currentUser?._id ||
                                                                        currentUser?.id;
                                                                      const updates =
                                                                        {
                                                                          contentType:
                                                                            customVal.trim(),
                                                                        };
                                                                      if (
                                                                        customVal.trim() ===
                                                                          "MOM" &&
                                                                        creatorId
                                                                      ) {
                                                                        updates.assignedTo =
                                                                          creatorId;
                                                                      }
                                                                      handleTaskFieldChange(
                                                                        task._id,
                                                                        updates,
                                                                      );
                                                                    }
                                                                  } else {
                                                                    const creatorId =
                                                                      task
                                                                        .createdBy
                                                                        ?._id ||
                                                                      task
                                                                        .createdBy
                                                                        ?.id ||
                                                                      (typeof task.createdBy ===
                                                                      "string"
                                                                        ? task.createdBy
                                                                        : null) ||
                                                                      currentUser?._id ||
                                                                      currentUser?.id;
                                                                    const updates =
                                                                      {
                                                                        contentType:
                                                                          val,
                                                                      };
                                                                    if (
                                                                      val ===
                                                                        "MOM" &&
                                                                      creatorId
                                                                    ) {
                                                                      updates.assignedTo =
                                                                        creatorId;
                                                                    }
                                                                    handleTaskFieldChange(
                                                                      task._id,
                                                                      updates,
                                                                    );
                                                                  }
                                                                }}
                                                                className={`badge-select ${
                                                                  task.contentType ===
                                                                  "VIDEO"
                                                                    ? "badge-type-video"
                                                                    : task.contentType ===
                                                                        "IMAGE"
                                                                      ? "badge-type-image"
                                                                      : task.contentType ===
                                                                          "CAROUSEL"
                                                                        ? "badge-type-carousel"
                                                                        : task.contentType ===
                                                                            "REEL"
                                                                          ? "badge-type-reel"
                                                                          : task.contentType ===
                                                                              "POST"
                                                                            ? "badge-type-post"
                                                                            : task.contentType ===
                                                                                "STORY"
                                                                              ? "badge-type-story"
                                                                              : task.contentType ===
                                                                                  "Website"
                                                                                ? "badge-type-video"
                                                                                : task.contentType ===
                                                                                    "SEO"
                                                                                  ? "badge-type-image"
                                                                                  : task.contentType ===
                                                                                      "Video shoot"
                                                                                    ? "badge-type-carousel"
                                                                                    : task.contentType ===
                                                                                        "MOM"
                                                                                      ? "badge-type-post"
                                                                                      : "badge-type-none"
                                                                }`}
                                                              >
                                                                <option value="">
                                                                  NONE
                                                                </option>
                                                                <option value="VIDEO">
                                                                  VIDEO
                                                                </option>
                                                                <option value="IMAGE">
                                                                  IMAGE
                                                                </option>
                                                                <option value="CAROUSEL">
                                                                  CAROUSEL
                                                                </option>
                                                                <option value="REEL">
                                                                  REEL
                                                                </option>
                                                                <option value="POST">
                                                                  POST
                                                                </option>
                                                                <option value="STORY">
                                                                  STORY
                                                                </option>
                                                                <option value="Website">
                                                                  Website
                                                                </option>
                                                                <option value="SEO">
                                                                  SEO
                                                                </option>
                                                                <option value="Video shoot">
                                                                  Video shoot
                                                                </option>
                                                                <option value="MOM">
                                                                  🤝 MOM
                                                                </option>
                                                                {task.contentType &&
                                                                  ![
                                                                    "VIDEO",
                                                                    "IMAGE",
                                                                    "CAROUSEL",
                                                                    "REEL",
                                                                    "POST",
                                                                    "STORY",
                                                                    "Website",
                                                                    "SEO",
                                                                    "Video shoot",
                                                                    "MOM",
                                                                  ].includes(
                                                                    task.contentType,
                                                                  ) && (
                                                                    <option
                                                                      value={
                                                                        task.contentType
                                                                      }
                                                                    >
                                                                      {
                                                                        task.contentType
                                                                      }
                                                                    </option>
                                                                  )}
                                                                {currentUser?.role ===
                                                                  "admin" && (
                                                                  <option value="__ADD_CUSTOM__">
                                                                    ➕ Custom...
                                                                  </option>
                                                                )}
                                                              </select>
                                                            ) : (
                                                              <span
                                                                className={`badge-span ${
                                                                  task.contentType ===
                                                                  "VIDEO"
                                                                    ? "badge-type-video"
                                                                    : task.contentType ===
                                                                        "IMAGE"
                                                                      ? "badge-type-image"
                                                                      : task.contentType ===
                                                                          "CAROUSEL"
                                                                        ? "badge-type-carousel"
                                                                        : task.contentType ===
                                                                            "REEL"
                                                                          ? "badge-type-reel"
                                                                          : task.contentType ===
                                                                              "POST"
                                                                            ? "badge-type-post"
                                                                            : task.contentType ===
                                                                                "STORY"
                                                                              ? "badge-type-story"
                                                                              : task.contentType ===
                                                                                  "Website"
                                                                                ? "badge-type-video"
                                                                                : task.contentType ===
                                                                                    "SEO"
                                                                                  ? "badge-type-image"
                                                                                  : task.contentType ===
                                                                                      "Video shoot"
                                                                                    ? "badge-type-carousel"
                                                                                    : "badge-type-none"
                                                                }`}
                                                              >
                                                                {task.contentType ||
                                                                  "NONE"}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </td>
                                                      )}

                                                      {/* Priority */}
                                                      {!hiddenColumns.priority && (
                                                        <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                          <div
                                                            onClick={(e) =>
                                                              e.stopPropagation()
                                                            }
                                                          >
                                                            {isSameDate(
                                                              task.startDate,
                                                              task.dueDate,
                                                            ) ? (
                                                              <span className="badge-span badge-priority-top-high">
                                                                🔴 Top High
                                                              </span>
                                                            ) : isAdminOrManager ? (
                                                              <select
                                                                value={
                                                                  task.priority ||
                                                                  "Medium"
                                                                }
                                                                onChange={(e) =>
                                                                  handleTaskFieldChange(
                                                                    task._id,
                                                                    {
                                                                      priority:
                                                                        e.target
                                                                          .value,
                                                                    },
                                                                  )
                                                                }
                                                                className={`badge-select ${
                                                                  task.priority ===
                                                                  "Top High"
                                                                    ? "badge-priority-top-high"
                                                                    : task.priority ===
                                                                        "High"
                                                                      ? "badge-priority-high"
                                                                      : task.priority ===
                                                                          "Medium"
                                                                        ? "badge-priority-medium"
                                                                        : "badge-priority-low"
                                                                }`}
                                                              >
                                                                <option value="Low">
                                                                  Low
                                                                </option>
                                                                <option value="Medium">
                                                                  Medium
                                                                </option>
                                                                <option value="High">
                                                                  High
                                                                </option>
                                                                <option value="Top High">
                                                                  Top High
                                                                </option>
                                                              </select>
                                                            ) : (
                                                              <span
                                                                className={`badge-span ${
                                                                  task.priority ===
                                                                  "Top High"
                                                                    ? "badge-priority-top-high"
                                                                    : task.priority ===
                                                                        "High"
                                                                      ? "badge-priority-high"
                                                                      : task.priority ===
                                                                          "Medium"
                                                                        ? "badge-priority-medium"
                                                                        : "badge-priority-low"
                                                                }`}
                                                              >
                                                                {task.priority ||
                                                                  "Medium"}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </td>
                                                      )}

                                                      {/* Status Column */}
                                                      {!hiddenColumns.status && (
                                                        <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                          <div
                                                            onClick={(e) =>
                                                              e.stopPropagation()
                                                            }
                                                          >
                                                            {isAdminOrManager &&
                                                            task.status !==
                                                              "Completed" &&
                                                            task.status !==
                                                              "Rejected" ? (
                                                              <select
                                                                value={
                                                                  task.status ||
                                                                  "Not Started"
                                                                }
                                                                onChange={(e) =>
                                                                  handleTaskFieldChange(
                                                                    task._id,
                                                                    {
                                                                      status:
                                                                        e.target
                                                                          .value,
                                                                    },
                                                                  )
                                                                }
                                                                className={`badge-select ${
                                                                  task.status ===
                                                                  "Completed"
                                                                    ? "badge-status-completed"
                                                                    : task.status ===
                                                                        "In Progress"
                                                                      ? "badge-status-in-progress"
                                                                      : task.status ===
                                                                            "IN-REVIEW" ||
                                                                          task.status ===
                                                                            "In Review" ||
                                                                          task.status ===
                                                                            "IN-Review"
                                                                        ? "badge-status-in-review"
                                                                        : task.status ===
                                                                            "Correction"
                                                                          ? "badge-status-correction"
                                                                          : task.status ===
                                                                              "On Hold"
                                                                            ? "badge-status-on-hold"
                                                                            : task.status ===
                                                                                "Rejected"
                                                                              ? "badge-status-rejected"
                                                                              : "badge-status-not-started"
                                                                }`}
                                                              >
                                                                  {task.contentType === "MOM" ? (
                                                                    <>
                                                                      <option value="Not Started">Not Started</option>
                                                                      {["In Progress", "On Hold", "In Review", "Correction"].includes(task.status) && (
                                                                        <option value={task.status}>{task.status}</option>
                                                                      )}
                                                                      <option value="Completed">Completed</option>
                                                                    </>
                                                                  ) : (
                                                                    <>
                                                                      <option value="Not Started">Not Started</option>
                                                                      {["In Progress", "On Hold", "In Review"].includes(task.status) && (
                                                                        <option value={task.status}>{task.status}</option>
                                                                      )}
                                                                      <option value="Correction">Correction</option>
                                                                      <option value="Completed">Completed</option>
                                                                      <option value="Rejected">Rejected</option>
                                                                    </>
                                                                  )}
                                                              </select>
                                                            ) : (
                                                              <span
                                                                className={`badge-span ${
                                                                  task.status ===
                                                                  "Completed"
                                                                    ? "badge-status-completed"
                                                                    : task.status ===
                                                                        "In Progress"
                                                                      ? "badge-status-in-progress"
                                                                      : task.status ===
                                                                          "In Review"
                                                                        ? "badge-status-in-review"
                                                                        : task.status ===
                                                                            "On Hold"
                                                                          ? "badge-status-on-hold"
                                                                          : task.status ===
                                                                              "Rejected"
                                                                            ? "badge-status-rejected"
                                                                            : "badge-status-not-started"
                                                                }`}
                                                              >
                                                                {getStatusWithEmoji(
                                                                  task.status,
                                                                )}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </td>
                                                      )}

                                                      {/* Revision Column */}
                                                      {!hiddenColumns.revision && (
                                                        <td
                                                          className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700"
                                                          onClick={(e) =>
                                                            e.stopPropagation()
                                                          }
                                                        >
                                                          <div className="flex justify-center items-center gap-1.5">
                                                            <span className="font-extrabold text-xs text-slate-800 dark:text-yellow-50 text-center">
                                                              {task.revisions ||
                                                                0}
                                                            </span>
                                                            {(task.revisions ||
                                                              0) > 3 && (
                                                              <span
                                                                className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)] animate-pulse"
                                                                title="More than 3 revisions"
                                                              />
                                                            )}
                                                          </div>
                                                        </td>
                                                      )}


                                                      {/* Approval Info */}
                                                      {!hiddenColumns.approvalInfo && (
                                                        <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 text-center whitespace-nowrap">
                                                          <ApprovalTimeDisplay
                                                            reviewStartedAt={
                                                              task.reviewStartedAt
                                                            }
                                                            completedAt={
                                                              task.completedAt
                                                            }
                                                            approvalWaitingMs={
                                                              task.approvalWaitingMs
                                                            }
                                                            status={task.status}
                                                            lastReviewStartedAt={
                                                              task.lastReviewStartedAt
                                                            }
                                                            reviewCycles={
                                                              task.reviewCycles
                                                            }
                                                          />
                                                        </td>
                                                      )}

                                                      {/* Action Controls */}
                                                      <td
                                                        className="px-3 py-1 border-b border-t border-slate-300 dark:border-slate-700 text-center"
                                                        style={{
                                                          borderRight: `2.5px solid ${sColor.hex}`,
                                                        }}
                                                      >
                                                        <div
                                                          className="flex items-center justify-center gap-2.5"
                                                          onClick={(e) =>
                                                            e.stopPropagation()
                                                          }
                                                        >
                                                          {isAdminOrManager && (
                                                            <>
                                                              <button
                                                                type="button"
                                                                onClick={() =>
                                                                  handleAddSubtaskViaButton(
                                                                    task,
                                                                  )
                                                                }
                                                                className="text-slate-455 hover:text-blue-500 dark:hover:text-[#3b82f6] transition-colors p-1 flex items-center gap-0.5 text-[9px] font-bold cursor-pointer"
                                                                title="Add Subtask"
                                                              >
                                                                <FiPlus
                                                                  size={11}
                                                                />
                                                                <span>
                                                                  Subtask
                                                                </span>
                                                              </button>

                                                              <button
                                                                type="button"
                                                                onClick={() =>
                                                                  handleParentTaskDelete(
                                                                    task._id,
                                                                  )
                                                                }
                                                                className="text-slate-455 hover:text-red-505 transition-colors p-1 cursor-pointer"
                                                                title="Delete Task"
                                                              >
                                                                <FiTrash2
                                                                  size={12}
                                                                />
                                                              </button>
                                                            </>
                                                          )}
                                                        </div>
                                                      </td>
                                                    </tr>

                                                    {isExpanded && (
                                                      <>
                                                        {(
                                                          task.subtasks || []
                                                        ).map((sub, subIdx) => {
                                                          const isSubCompleted =
                                                            sub.status ===
                                                            "Completed";
                                                          const canToggleSub =
                                                            isAdminOrManager ||
                                                            sub.assignedTo
                                                              ?._id ===
                                                              currentUser?._id ||
                                                            sub.assignedTo ===
                                                              currentUser?._id;
                                                          const isSubRejected =
                                                            sub.status ===
                                                            "Rejected";
                                                          const isSubInReview =
                                                            sub.status ===
                                                            "In Review";
                                                          const isSubInProgress =
                                                            sub.status ===
                                                            "In Progress";
                                                          const rowBgSub =
                                                            isSubRejected
                                                              ? "!bg-[#fde8e8] text-rose-950 dark:!bg-[#2c1214] dark:text-rose-200 opacity-80 pointer-events-none !border-rose-300 dark:!border-rose-800/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                                                              : "bg-amber-50 dark:bg-[#16161b] text-slate-855 dark:text-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";

                                                          return (
                                                            <tr
                                                              key={
                                                                sub._id ||
                                                                subIdx
                                                              }
                                                              className={`group/subrow transition-colors ${rowBgSub} hover:bg-blue-50/10 dark:hover:bg-[#3b82f6]/5`}
                                                            >
                                                              {showSelectionColumn && (
                                                                <td
                                                                  className={`px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 text-center w-10 md:sticky md:left-0 z-30 ${rowBgSub}`}
                                                                  style={{
                                                                    width:
                                                                      "40px",
                                                                    minWidth:
                                                                      "40px",
                                                                    maxWidth:
                                                                      "40px",
                                                                    borderLeft: `2.5px solid ${sColor.hex}`,
                                                                  }}
                                                                />
                                                              )}
                                                              {/* Empty Chevron Column for Subtask */}
                                                              <td
                                                                className={`px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 md:sticky z-30 ${rowBgSub}`}
                                                                style={{
                                                                  left: showSelectionColumn
                                                                    ? "40px"
                                                                    : "0px",
                                                                  width: "40px",
                                                                  minWidth:
                                                                    "40px",
                                                                  maxWidth:
                                                                    "40px",
                                                                  borderLeft:
                                                                    !showSelectionColumn
                                                                      ? `2.5px solid ${sColor.hex}`
                                                                      : undefined,
                                                                }}
                                                              />
                                                              {/* Subtask ID Column */}
                                                              <td
                                                                className={`px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 font-bold text-slate-500 dark:text-slate-500 whitespace-nowrap md:sticky z-30 ${rowBgSub}`}
                                                                style={{
                                                                  left: showSelectionColumn
                                                                    ? "80px"
                                                                    : "40px",
                                                                  minWidth:
                                                                    "60px",
                                                                  maxWidth:
                                                                    "60px",
                                                                  width: "60px",
                                                                }}
                                                              >
                                                                {getTaskDisplayId(
                                                                  task,
                                                                )}
                                                                .{subIdx + 1}
                                                              </td>
                                                              {/* 1. Name Column */}
                                                              <td
                                                                className={`px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 font-semibold md:sticky z-30 min-w-[250px] md:min-w-[400px] ${rowBgSub}`}
                                                                style={{
                                                                  left: showSelectionColumn
                                                                    ? "140px"
                                                                    : "100px",
                                                                }}
                                                                onClick={(e) =>
                                                                  e.stopPropagation()
                                                                }
                                                              >
                                                                <div className="flex items-center gap-2 w-full pl-4 border-l border-slate-150 dark:border-slate-850">
                                                                  <FiCornerDownRight
                                                                    className="text-slate-450 shrink-0"
                                                                    size={11}
                                                                  />

                                                                  {/* Subtask Checkbox */}
                                                                  <button
                                                                    type="button"
                                                                    onClick={(
                                                                      e,
                                                                    ) => {
                                                                      e.stopPropagation();
                                                                      if (
                                                                        canToggleSub
                                                                      ) {
                                                                        handleSubtaskFieldChange(
                                                                          task,
                                                                          sub._id,
                                                                          {
                                                                            status:
                                                                              isSubCompleted
                                                                                ? "Not Started"
                                                                                : "Completed",
                                                                          },
                                                                        );
                                                                      }
                                                                    }}
                                                                    disabled={
                                                                      !canToggleSub
                                                                    }
                                                                    className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                                                                      !canToggleSub
                                                                        ? "cursor-not-allowed opacity-50"
                                                                        : "cursor-pointer"
                                                                    } ${
                                                                      isSubCompleted
                                                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                                                        : "border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-[#3b82f6] text-transparent hover:text-slate-400 dark:hover:text-[#3b82f6]"
                                                                    }`}
                                                                  >
                                                                    <FiCheck
                                                                      size={8}
                                                                    />
                                                                  </button>

                                                                  {/* Subtask Title Input */}
                                                                  <span
                                                                    ref={(
                                                                      el,
                                                                    ) => {
                                                                      if (
                                                                        autoFocusSubtaskIdx ===
                                                                          subIdx &&
                                                                        el
                                                                      ) {
                                                                        el.focus();
                                                                        const range =
                                                                          document.createRange();
                                                                        range.selectNodeContents(
                                                                          el,
                                                                        );
                                                                        const sel =
                                                                          window.getSelection();
                                                                        sel.removeAllRanges();
                                                                        sel.addRange(
                                                                          range,
                                                                        );
                                                                        setAutoFocusSubtaskIdx(
                                                                          null,
                                                                        );
                                                                      }
                                                                    }}
                                                                    contentEditable={
                                                                      canToggleSub
                                                                    }
                                                                    suppressContentEditableWarning={
                                                                      true
                                                                    }
                                                                    placeholder="Write a subtask..."
                                                                    onBlur={(
                                                                      e,
                                                                    ) => {
                                                                      const val =
                                                                        e.target.innerText.trim();
                                                                      if (
                                                                        val !==
                                                                        sub.title
                                                                      ) {
                                                                        handleSubtaskFieldChange(
                                                                          task,
                                                                          sub._id,
                                                                          {
                                                                            title:
                                                                              val,
                                                                          },
                                                                        );
                                                                      }
                                                                    }}
                                                                    onKeyDown={(
                                                                      e,
                                                                    ) => {
                                                                      if (
                                                                        e.key ===
                                                                        "Enter"
                                                                      ) {
                                                                        e.preventDefault();
                                                                        handleSubtaskEnterKey(
                                                                          task,
                                                                          subIdx,
                                                                          e
                                                                            .target
                                                                            .innerText,
                                                                          false,
                                                                        );
                                                                      }
                                                                    }}
                                                                    className={`outline-none w-full font-bold text-slate-705 dark:text-white text-[11px] block min-h-[16px] cursor-text ${
                                                                      isSubCompleted
                                                                        ? "line-through text-slate-450 dark:text-slate-550"
                                                                        : ""
                                                                    }`}
                                                                  >
                                                                    {sub.title}
                                                                  </span>
                                                                  <button
                                                                    type="button"
                                                                    onClick={(
                                                                      e,
                                                                    ) => {
                                                                      e.stopPropagation();
                                                                      setSelectedTaskId(
                                                                        task._id,
                                                                      );
                                                                      setTimeout(
                                                                        () => {
                                                                          const el =
                                                                            document.getElementById(
                                                                              "drawer-subtasks-section",
                                                                            );
                                                                          if (
                                                                            el
                                                                          ) {
                                                                            el.scrollIntoView(
                                                                              {
                                                                                behavior:
                                                                                  "smooth",
                                                                                block:
                                                                                  "start",
                                                                              },
                                                                            );
                                                                          }
                                                                        },
                                                                        350,
                                                                      );
                                                                    }}
                                                                    className="shrink-0 text-slate-400 dark:text-slate-555 hover:text-blue-500 dark:hover:text-[#3b82f6] p-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-all opacity-0 group-hover/subrow:opacity-100 cursor-pointer ml-auto"
                                                                    title="Open Details & View Subtasks"
                                                                  >
                                                                    <FiChevronRight
                                                                      size={12}
                                                                    />
                                                                  </button>
                                                                </div>
                                                              </td>

                                                              {/* Content Copy Column */}
                                                              <td
                                                                className={`px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 ${hiddenColumns.contentCopy ? "hidden" : ""}`}
                                                              >
                                                                <div
                                                                  onClick={(
                                                                    e,
                                                                  ) =>
                                                                    e.stopPropagation()
                                                                  }
                                                                  className="w-full"
                                                                >
                                                                  <ContentCopyInput
                                                                    value={
                                                                      sub.contentCopy
                                                                    }
                                                                    onChange={(
                                                                      newVal,
                                                                    ) =>
                                                                      handleSubtaskFieldChange(
                                                                        task,
                                                                        sub._id,
                                                                        {
                                                                          contentCopy:
                                                                            newVal,
                                                                        },
                                                                      )
                                                                    }
                                                                  />
                                                                </div>
                                                              </td>
                                                              {/* 2. Client Column */}
                                                              {!hiddenColumns.client && (
                                                                <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                                  <div
                                                                    onClick={(
                                                                      e,
                                                                    ) =>
                                                                      e.stopPropagation()
                                                                    }
                                                                  >
                                                                    <ClientDropdown
                                                                      selectedClient={
                                                                        sub
                                                                          .client
                                                                          ?._id ||
                                                                        sub.client ||
                                                                        task
                                                                          .client
                                                                          ?._id ||
                                                                        task.client ||
                                                                        activeProject
                                                                          ?.client
                                                                          ?._id ||
                                                                        activeProject?.client
                                                                      }
                                                                      clients={
                                                                        clients
                                                                      }
                                                                      onChange={(
                                                                        clientId,
                                                                      ) =>
                                                                        handleSubtaskFieldChange(
                                                                          task,
                                                                          sub._id,
                                                                          {
                                                                            client:
                                                                              clientId,
                                                                          },
                                                                        )
                                                                      }
                                                                      isAdminOrManager={
                                                                        isAdminOrManager
                                                                      }
                                                                    />
                                                                  </div>
                                                                </td>
                                                              )}

                                                              {/* Created By Column */}
                                                              {!hiddenColumns.createdBy && (
                                                                <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 opacity-60">
                                                                  {task.createdBy ? (
                                                                    <div className="flex items-center gap-2">
                                                                      {task
                                                                        .createdBy
                                                                        .profile
                                                                        ?.profileImage
                                                                        ?.url ||
                                                                      task
                                                                        .createdBy
                                                                        .profileImage
                                                                        ?.url ||
                                                                      task
                                                                        .createdBy
                                                                        .profile
                                                                        ?.avatar ||
                                                                      task
                                                                        .createdBy
                                                                        .avatar ? (
                                                                        <img
                                                                          src={
                                                                            task
                                                                              .createdBy
                                                                              .profile
                                                                              ?.profileImage
                                                                              ?.url ||
                                                                            task
                                                                              .createdBy
                                                                              .profileImage
                                                                              ?.url ||
                                                                            task
                                                                              .createdBy
                                                                              .profile
                                                                              ?.avatar ||
                                                                            task
                                                                              .createdBy
                                                                              .avatar
                                                                          }
                                                                          alt={
                                                                            task
                                                                              .createdBy
                                                                              .name
                                                                          }
                                                                          className="w-4 h-4 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
                                                                        />
                                                                      ) : (
                                                                        <div
                                                                          className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[7.5px] font-bold bg-gradient-to-br shrink-0 ${getAvatarColor(
                                                                            task
                                                                              .createdBy
                                                                              .name ||
                                                                              "U",
                                                                          )}`}
                                                                        >
                                                                          {getInitials(
                                                                            task
                                                                              .createdBy
                                                                              .name ||
                                                                              "U",
                                                                          )}
                                                                        </div>
                                                                      )}
                                                                      <span
                                                                        className="text-[9.5px] font-semibold text-slate-705 dark:text-slate-400 truncate max-w-[85px]"
                                                                        title={
                                                                          task
                                                                            .createdBy
                                                                            .name
                                                                        }
                                                                      >
                                                                        {
                                                                          task
                                                                            .createdBy
                                                                            .name
                                                                        }
                                                                      </span>
                                                                    </div>
                                                                  ) : (
                                                                    <span className="text-slate-400 dark:text-slate-550 text-[9px] font-normal">
                                                                      N/A
                                                                    </span>
                                                                  )}
                                                                </td>
                                                              )}

                                                              {/* 3. Start Date Column */}
                                                              {!hiddenColumns.startDate && (
                                                                <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                                  <div
                                                                    className={`relative h-7 flex items-center justify-start transition-all ${
                                                                      sub.startDate
                                                                        ? "cursor-not-allowed"
                                                                        : "cursor-pointer"
                                                                    }`}
                                                                    onClick={(
                                                                      e,
                                                                    ) => {
                                                                      e.stopPropagation();
                                                                      if (
                                                                        !sub.startDate
                                                                      ) {
                                                                        const input =
                                                                          e.currentTarget.querySelector(
                                                                            'input[type="date"]',
                                                                          );
                                                                        if (
                                                                          input &&
                                                                          typeof input.showPicker ===
                                                                            "function"
                                                                        ) {
                                                                          input.showPicker();
                                                                        }
                                                                      }
                                                                    }}
                                                                  >
                                                                    {sub.startDate ? (
                                                                      <div
                                                                        className="flex items-center flex-nowrap gap-1 px-1.5 py-0.5 rounded-md border border-blue-300 dark:border-blue-800/80 text-blue-855 dark:text-blue-200 text-[9.5px] font-bold bg-blue-100/90 dark:bg-blue-955/75 transition-all shadow-2xs opacity-90 cursor-not-allowed select-none"
                                                                        title="🔒 Start Date — Locked"
                                                                      >
                                                                        <FiLock
                                                                          size={
                                                                            9.5
                                                                          }
                                                                          className="text-amber-600 dark:text-amber-400 shrink-0"
                                                                        />
                                                                        <span className="whitespace-nowrap">
                                                                          {new Date(
                                                                            sub.startDate,
                                                                          ).toLocaleDateString(
                                                                            undefined,
                                                                            {
                                                                              month:
                                                                                "short",
                                                                              day: "numeric",
                                                                            },
                                                                          )}
                                                                        </span>
                                                                        <span className="ml-0.5 text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest shrink-0">
                                                                          🔒
                                                                        </span>
                                                                      </div>
                                                                    ) : (
                                                                      <div className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-blue-300 dark:border-blue-800/80 text-blue-605 dark:text-blue-400/90 hover:border-blue-400 hover:text-blue-755 dark:hover:text-blue-305 dark:hover:border-blue-600/80 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-955/50 transition-all text-[8px] font-bold">
                                                                        <FiCalendar
                                                                          size={
                                                                            9.5
                                                                          }
                                                                        />
                                                                        <span>
                                                                          +
                                                                          Start
                                                                          Date
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                    {isAdminOrManager &&
                                                                      !sub.startDate && (
                                                                        <input
                                                                          type="date"
                                                                          value=""
                                                                          onChange={(
                                                                            e,
                                                                          ) =>
                                                                            handleSubtaskFieldChange(
                                                                              task,
                                                                              sub._id,
                                                                              {
                                                                                startDate:
                                                                                  e
                                                                                    .target
                                                                                    .value ||
                                                                                  null,
                                                                              },
                                                                            )
                                                                          }
                                                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                        />
                                                                      )}
                                                                  </div>
                                                                </td>
                                                              )}

                                                              {/* 4. End Date Column */}
                                                              {!hiddenColumns.endDate && (
                                                                <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                                  <div
                                                                    className={`relative h-7 flex items-center justify-start transition-all ${
                                                                      sub.dueDate
                                                                        ? "cursor-not-allowed"
                                                                        : "cursor-pointer"
                                                                    }`}
                                                                    onClick={(
                                                                      e,
                                                                    ) => {
                                                                      e.stopPropagation();
                                                                      if (
                                                                        !sub.dueDate
                                                                      ) {
                                                                        const input =
                                                                          e.currentTarget.querySelector(
                                                                            'input[type="date"]',
                                                                          );
                                                                        if (
                                                                          input &&
                                                                          typeof input.showPicker ===
                                                                            "function"
                                                                        ) {
                                                                          input.showPicker();
                                                                        }
                                                                      }
                                                                    }}
                                                                  >
                                                                    {sub.dueDate ? (
                                                                      <div
                                                                        className="flex items-center flex-nowrap gap-1 px-1.5 py-0.5 rounded-md border border-rose-300 dark:border-rose-750/80 text-rose-850 dark:text-rose-200 text-[9.5px] font-bold bg-rose-100/90 dark:bg-rose-955/75 transition-all shadow-2xs opacity-90 cursor-not-allowed select-none"
                                                                        title="🔒 End Date — Locked"
                                                                      >
                                                                        <FiLock
                                                                          size={
                                                                            9.5
                                                                          }
                                                                          className="text-amber-600 dark:text-amber-400 shrink-0"
                                                                        />
                                                                        <span className="whitespace-nowrap">
                                                                          {new Date(
                                                                            sub.dueDate,
                                                                          ).toLocaleDateString(
                                                                            undefined,
                                                                            {
                                                                              month:
                                                                                "short",
                                                                              day: "numeric",
                                                                            },
                                                                          )}
                                                                        </span>
                                                                        <span className="ml-0.5 text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest shrink-0">
                                                                          🔒
                                                                        </span>
                                                                      </div>
                                                                    ) : (
                                                                      <div className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md border border-dashed border-rose-300 dark:border-rose-800/80 text-rose-605 dark:text-rose-400/90 hover:border-rose-400 hover:text-rose-750 dark:hover:text-rose-300 dark:hover:border-rose-600/80 bg-rose-50/50 dark:bg-rose-955/20 hover:bg-rose-100 dark:hover:bg-rose-955/50 transition-all text-[8px] font-bold">
                                                                        <FiCalendar
                                                                          size={
                                                                            9.5
                                                                          }
                                                                        />
                                                                        <span>
                                                                          + End
                                                                          Date
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                    {isAdminOrManager &&
                                                                      !sub.dueDate && (
                                                                        <input
                                                                          type="date"
                                                                          value=""
                                                                          min={
                                                                            sub.startDate
                                                                              ? new Date(
                                                                                  sub.startDate,
                                                                                )
                                                                                  .toISOString()
                                                                                  .split(
                                                                                    "T",
                                                                                  )[0]
                                                                              : ""
                                                                          }
                                                                          onChange={(
                                                                            e,
                                                                          ) =>
                                                                            handleSubtaskFieldChange(
                                                                              task,
                                                                              sub._id,
                                                                              {
                                                                                dueDate:
                                                                                  e
                                                                                    .target
                                                                                    .value ||
                                                                                  null,
                                                                              },
                                                                            )
                                                                          }
                                                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                        />
                                                                      )}
                                                                  </div>
                                                                </td>
                                                              )}

                                                              {/* 5. Assignee Column */}
                                                              {!hiddenColumns.assignee && (
                                                                <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                                  <div
                                                                    className="flex items-center gap-1.5"
                                                                    onClick={(
                                                                      e,
                                                                    ) =>
                                                                      e.stopPropagation()
                                                                    }
                                                                  >
                                                                    <AssigneeDropdown
                                                                      selectedUser={
                                                                        sub.assignedTo
                                                                      }
                                                                      users={
                                                                        users
                                                                      }
                                                                      onChange={(userId) => {
                                                                        if (!sub.title || sub.title.trim() === "") {
                                                                          toast.error("Please fill the task name first");
                                                                          return;
                                                                        }
                                                                        handleSubtaskFieldChange(
                                                                          task,
                                                                          sub._id,
                                                                          {
                                                                            assignedTo: userId,
                                                                          }
                                                                        );
                                                                      }}
                                                                      isAdminOrManager={
                                                                        isAdminOrManager
                                                                      }
                                                                      disabled={
                                                                        sub.contentType ===
                                                                        "MOM"
                                                                      }
                                                                      isLocked={
                                                                        sub.contentType ===
                                                                        "MOM"
                                                                      }
                                                                      isMOM={
                                                                        sub.contentType ===
                                                                        "MOM"
                                                                      }
                                                                      currentUser={
                                                                        currentUser
                                                                      }
                                                                      getAvatarColor={
                                                                        getAvatarColor
                                                                      }
                                                                      size="md"
                                                                    />
                                                                  </div>
                                                                </td>
                                                              )}

                                                              {/* 6. Content Type Column */}
                                                              {!hiddenColumns.contentType && (
                                                                <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 min-w-[160px] w-[180px]">
                                                                  <div
                                                                    onClick={(
                                                                      e,
                                                                    ) =>
                                                                      e.stopPropagation()
                                                                    }
                                                                  >
                                                                    {isAdminOrManager ? (
                                                                      <select
                                                                        value={
                                                                          sub.contentType ||
                                                                          ""
                                                                        }
                                                                        onChange={(
                                                                          e,
                                                                        ) => {
                                                                          const val =
                                                                            e
                                                                              .target
                                                                              .value;
                                                                          const creatorId =
                                                                            sub
                                                                              .createdBy
                                                                              ?._id ||
                                                                            sub
                                                                              .createdBy
                                                                              ?.id ||
                                                                            (typeof sub.createdBy ===
                                                                            "string"
                                                                              ? sub.createdBy
                                                                              : null) ||
                                                                            task
                                                                              .createdBy
                                                                              ?._id ||
                                                                            task
                                                                              .createdBy
                                                                              ?.id ||
                                                                            (typeof task.createdBy ===
                                                                            "string"
                                                                              ? task.createdBy
                                                                              : null) ||
                                                                            currentUser?._id ||
                                                                            currentUser?.id;
                                                                          if (
                                                                            val ===
                                                                            "__ADD_CUSTOM__"
                                                                          ) {
                                                                            const customVal =
                                                                              prompt(
                                                                                "Enter custom content type:",
                                                                              );
                                                                            if (
                                                                              customVal &&
                                                                              customVal.trim() !==
                                                                                ""
                                                                            ) {
                                                                              const updates =
                                                                                {
                                                                                  contentType:
                                                                                    customVal.trim(),
                                                                                };
                                                                              if (
                                                                                customVal.trim() ===
                                                                                  "MOM" &&
                                                                                creatorId
                                                                              ) {
                                                                                updates.assignedTo =
                                                                                  creatorId;
                                                                              }
                                                                              handleSubtaskFieldChange(
                                                                                task,
                                                                                sub._id,
                                                                                updates,
                                                                              );
                                                                            }
                                                                          } else {
                                                                            const updates =
                                                                              {
                                                                                contentType:
                                                                                  val,
                                                                              };
                                                                            if (
                                                                              val ===
                                                                                "MOM" &&
                                                                              creatorId
                                                                            ) {
                                                                              updates.assignedTo =
                                                                                creatorId;
                                                                            }
                                                                            handleSubtaskFieldChange(
                                                                              task,
                                                                              sub._id,
                                                                              updates,
                                                                            );
                                                                          }
                                                                        }}
                                                                        className={`badge-select w-full min-w-[140px] ${
                                                                          sub.contentType ===
                                                                          "VIDEO"
                                                                            ? "badge-type-video"
                                                                            : sub.contentType ===
                                                                                "IMAGE"
                                                                              ? "badge-type-image"
                                                                              : sub.contentType ===
                                                                                  "CAROUSEL"
                                                                                ? "badge-type-carousel"
                                                                                : sub.contentType ===
                                                                                    "REEL"
                                                                                  ? "badge-type-reel"
                                                                                  : sub.contentType ===
                                                                                      "POST"
                                                                                    ? "badge-type-post"
                                                                                    : sub.contentType ===
                                                                                        "STORY"
                                                                                      ? "badge-type-story"
                                                                                      : sub.contentType ===
                                                                                          "Website"
                                                                                        ? "badge-type-video"
                                                                                        : sub.contentType ===
                                                                                            "SEO"
                                                                                          ? "badge-type-image"
                                                                                          : sub.contentType ===
                                                                                              "Video shoot"
                                                                                            ? "badge-type-carousel"
                                                                                            : sub.contentType ===
                                                                                                "MOM"
                                                                                              ? "badge-type-post"
                                                                                              : "badge-type-none"
                                                                        }`}
                                                                      >
                                                                        <option value="">
                                                                          NONE
                                                                        </option>
                                                                        <option value="VIDEO">
                                                                          VIDEO
                                                                        </option>
                                                                        <option value="IMAGE">
                                                                          IMAGE
                                                                        </option>
                                                                        <option value="CAROUSEL">
                                                                          CAROUSEL
                                                                        </option>
                                                                        <option value="REEL">
                                                                          REEL
                                                                        </option>
                                                                        <option value="POST">
                                                                          POST
                                                                        </option>
                                                                        <option value="STORY">
                                                                          STORY
                                                                        </option>
                                                                        <option value="Website">
                                                                          Website
                                                                        </option>
                                                                        <option value="SEO">
                                                                          SEO
                                                                        </option>
                                                                        <option value="Video shoot">
                                                                          Video
                                                                          shoot
                                                                        </option>
                                                                        <option value="MOM">
                                                                          🤝 MOM
                                                                        </option>
                                                                        {sub.contentType &&
                                                                          ![
                                                                            "VIDEO",
                                                                            "IMAGE",
                                                                            "CAROUSEL",
                                                                            "REEL",
                                                                            "POST",
                                                                            "STORY",
                                                                            "Website",
                                                                            "SEO",
                                                                            "Video shoot",
                                                                            "MOM",
                                                                          ].includes(
                                                                            sub.contentType,
                                                                          ) && (
                                                                            <option
                                                                              value={
                                                                                sub.contentType
                                                                              }
                                                                            >
                                                                              {
                                                                                sub.contentType
                                                                              }
                                                                            </option>
                                                                          )}
                                                                        {currentUser?.role ===
                                                                          "admin" && (
                                                                          <option value="__ADD_CUSTOM__">
                                                                            ➕
                                                                            Custom...
                                                                          </option>
                                                                        )}
                                                                      </select>
                                                                    ) : (
                                                                      <span
                                                                        className={`badge-span ${
                                                                          sub.contentType ===
                                                                          "VIDEO"
                                                                            ? "badge-type-video"
                                                                            : sub.contentType ===
                                                                                "IMAGE"
                                                                              ? "badge-type-image"
                                                                              : sub.contentType ===
                                                                                  "CAROUSEL"
                                                                                ? "badge-type-carousel"
                                                                                : sub.contentType ===
                                                                                    "REEL"
                                                                                  ? "badge-type-reel"
                                                                                  : sub.contentType ===
                                                                                      "POST"
                                                                                    ? "badge-type-post"
                                                                                    : sub.contentType ===
                                                                                        "STORY"
                                                                                      ? "badge-type-story"
                                                                                      : sub.contentType ===
                                                                                          "Website"
                                                                                        ? "badge-type-video"
                                                                                        : sub.contentType ===
                                                                                            "SEO"
                                                                                          ? "badge-type-image"
                                                                                          : sub.contentType ===
                                                                                              "Video shoot"
                                                                                            ? "badge-type-carousel"
                                                                                            : "badge-type-none"
                                                                        }`}
                                                                      >
                                                                        {sub.contentType ||
                                                                          "NONE"}
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                </td>
                                                              )}

                                                              {/* 7. Priority Column */}
                                                              {!hiddenColumns.priority && (
                                                                <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                                  <div
                                                                    onClick={(
                                                                      e,
                                                                    ) =>
                                                                      e.stopPropagation()
                                                                    }
                                                                  >
                                                                    {isSameDate(
                                                                      sub.startDate ||
                                                                        task.startDate,
                                                                      sub.dueDate ||
                                                                        task.dueDate,
                                                                    ) ? (
                                                                      <span className="badge-span badge-priority-top-high">
                                                                        🔴 Top
                                                                        High
                                                                      </span>
                                                                    ) : isAdminOrManager ? (
                                                                      <select
                                                                        value={
                                                                          sub.priority ||
                                                                          "Medium"
                                                                        }
                                                                        onChange={(
                                                                          e,
                                                                        ) =>
                                                                          handleSubtaskFieldChange(
                                                                            task,
                                                                            sub._id,
                                                                            {
                                                                              priority:
                                                                                e
                                                                                  .target
                                                                                  .value,
                                                                            },
                                                                          )
                                                                        }
                                                                        className={`badge-select ${
                                                                          sub.priority ===
                                                                          "Top High"
                                                                            ? "badge-priority-top-high"
                                                                            : sub.priority ===
                                                                                "High"
                                                                              ? "badge-priority-high"
                                                                              : sub.priority ===
                                                                                  "Medium"
                                                                                ? "badge-priority-medium"
                                                                                : "badge-priority-low"
                                                                        }`}
                                                                      >
                                                                        <option value="Low">
                                                                          Low
                                                                        </option>
                                                                        <option value="Medium">
                                                                          Medium
                                                                        </option>
                                                                        <option value="High">
                                                                          High
                                                                        </option>
                                                                        <option value="Top High">
                                                                          Top
                                                                          High
                                                                        </option>
                                                                      </select>
                                                                    ) : (
                                                                      <span
                                                                        className={`badge-span ${
                                                                          sub.priority ===
                                                                          "Top High"
                                                                            ? "badge-priority-top-high"
                                                                            : sub.priority ===
                                                                                "High"
                                                                              ? "badge-priority-high"
                                                                              : sub.priority ===
                                                                                  "Medium"
                                                                                ? "badge-priority-medium"
                                                                                : "badge-priority-low"
                                                                        }`}
                                                                      >
                                                                        {sub.priority ||
                                                                          "Medium"}
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                </td>
                                                              )}

                                                              {/* 8. Status Column */}
                                                              {!hiddenColumns.status && (
                                                                <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700">
                                                                  <div
                                                                    onClick={(
                                                                      e,
                                                                    ) =>
                                                                      e.stopPropagation()
                                                                    }
                                                                  >
                                                                    {isAdminOrManager &&
                                                                    sub.status !==
                                                                      "Completed" &&
                                                                    sub.status !==
                                                                      "Rejected" ? (
                                                                      <select
                                                                        value={
                                                                          sub.status ||
                                                                          "Not Started"
                                                                        }
                                                                        onChange={(
                                                                          e,
                                                                        ) =>
                                                                          handleSubtaskFieldChange(
                                                                            task,
                                                                            sub._id,
                                                                            {
                                                                              status:
                                                                                e
                                                                                  .target
                                                                                  .value,
                                                                            },
                                                                          )
                                                                        }
                                                                        className={`badge-select ${
                                                                          sub.status ===
                                                                          "Completed"
                                                                            ? "badge-status-completed"
                                                                            : sub.status ===
                                                                                "In Progress"
                                                                              ? "badge-status-in-progress"
                                                                              : sub.status ===
                                                                                  "In Review"
                                                                                ? "badge-status-in-review"
                                                                                : sub.status ===
                                                                                    "Correction"
                                                                                  ? "badge-status-correction"
                                                                                  : sub.status ===
                                                                                      "On Hold"
                                                                                    ? "badge-status-on-hold"
                                                                                    : sub.status ===
                                                                                        "Rejected"
                                                                                      ? "badge-status-rejected"
                                                                                      : "badge-status-not-started"
                                                                        }`}
                                                                      >
                                                                        {sub.contentType === "MOM" ? (
                                                                          <>
                                                                            <option value="Not Started">Not Started</option>
                                                                            {["In Progress", "On Hold", "In Review", "Correction"].includes(sub.status) && (
                                                                              <option value={sub.status}>{sub.status}</option>
                                                                            )}
                                                                            <option value="Completed">Completed</option>
                                                                          </>
                                                                        ) : (
                                                                          <>
                                                                            <option value="Not Started">Not Started</option>
                                                                            {["In Progress", "On Hold", "In Review"].includes(sub.status) && (
                                                                              <option value={sub.status}>{sub.status}</option>
                                                                            )}
                                                                            <option value="Correction">Correction</option>
                                                                            <option value="Completed">Completed</option>
                                                                            <option value="Rejected">Rejected</option>
                                                                          </>
                                                                        )}
                                                                      </select>
                                                                    ) : (
                                                                      <span
                                                                        className={`badge-span ${
                                                                          sub.status ===
                                                                          "Completed"
                                                                            ? "badge-status-completed"
                                                                            : sub.status ===
                                                                                "In Progress"
                                                                              ? "badge-status-in-progress"
                                                                              : sub.status ===
                                                                                    "IN-REVIEW" ||
                                                                                  sub.status ===
                                                                                    "In Review" ||
                                                                                  sub.status ===
                                                                                    "IN-Review"
                                                                                ? "badge-status-in-review"
                                                                                : sub.status ===
                                                                                    "On Hold"
                                                                                  ? "badge-status-on-hold"
                                                                                  : sub.status ===
                                                                                      "Rejected"
                                                                                    ? "badge-status-rejected"
                                                                                    : "badge-status-not-started"
                                                                        }`}
                                                                      >
                                                                        {getStatusWithEmoji(
                                                                          sub.status,
                                                                        )}
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                </td>
                                                              )}

                                                              {/* Subtask Revision Column */}
                                                              {!hiddenColumns.revision && (
                                                                <td
                                                                  className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700"
                                                                  onClick={(
                                                                    e,
                                                                  ) =>
                                                                    e.stopPropagation()
                                                                  }
                                                                >
                                                                  <div className="flex justify-center items-center gap-1.5">
                                                                    <span className="font-extrabold text-xs text-slate-800 dark:text-yellow-50 text-center">
                                                                      {sub.revisions ||
                                                                        0}
                                                                    </span>
                                                                    {(sub.revisions ||
                                                                      0) >
                                                                      3 && (
                                                                      <span
                                                                        className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)] animate-pulse"
                                                                        title="More than 3 revisions"
                                                                      />
                                                                    )}
                                                                  </div>
                                                                </td>
                                                              )}


                                                              {/* Approval Info Column */}
                                                              {!hiddenColumns.approvalInfo && (
                                                                <td className="px-3 py-1 border-r border-b border-t border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 text-center whitespace-nowrap">
                                                                  <ApprovalTimeDisplay
                                                                    reviewStartedAt={
                                                                      sub.reviewStartedAt
                                                                    }
                                                                    completedAt={
                                                                      sub.completedAt
                                                                    }
                                                                    approvalWaitingMs={
                                                                      sub.approvalWaitingMs
                                                                    }
                                                                    status={
                                                                      sub.status
                                                                    }
                                                                    lastReviewStartedAt={
                                                                      sub.lastReviewStartedAt
                                                                    }
                                                                    reviewCycles={
                                                                      sub.reviewCycles
                                                                    }
                                                                  />
                                                                </td>
                                                              )}

                                                              {/* 9. Actions Column */}
                                                              <td
                                                                className="px-3 py-1 border-b border-t border-slate-300 dark:border-slate-700 text-center"
                                                                style={{
                                                                  borderRight: `2.5px solid ${sColor.hex}`,
                                                                }}
                                                              >
                                                                <div
                                                                  className="flex items-center justify-center gap-2.5 opacity-0 group-hover/subrow:opacity-100 transition-opacity"
                                                                  onClick={(
                                                                    e,
                                                                  ) =>
                                                                    e.stopPropagation()
                                                                  }
                                                                >
                                                                  {isAdminOrManager && (
                                                                    <button
                                                                      type="button"
                                                                      onClick={() =>
                                                                        handleDeleteSubtask(
                                                                          task,
                                                                          sub._id,
                                                                        )
                                                                      }
                                                                      className="text-slate-455 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                                                      title="Delete Subtask"
                                                                    >
                                                                      <FiTrash2
                                                                        size={
                                                                          12
                                                                        }
                                                                      />
                                                                    </button>
                                                                  )}
                                                                </div>
                                                              </td>
                                                            </tr>
                                                          );
                                                        })}
                                                      </>
                                                    )}
                                                  </React.Fragment>
                                                );
                                              },
                                            )}
                                            {renderInlineCreateRow(
                                              sectionName,
                                              sColor,
                                            )}
                                          </>
                                        )}

                                        {/* Spacer row between sections */}
                                        <tr className=" pointer-events-none">
                                          <td
                                            colSpan={
                                              showSelectionColumn ? 14 : 13
                                            }
                                            className=" p-0 border-0 bg-transparent"
                                          />
                                        </tr>
                                      </tbody>
                                    )}
                                  </Draggable>
                                );
                              },
                            );
                          })()}
                          {provided.placeholder}
                        </table>
                      )}
                    </StrictModeDroppable>
                  </div>
                </div>
              );
            })()}
          </DragDropContext>


      </div>

      {/* OFFCANVAS TASK DETAILS DRAWER */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTaskId(null)}
              className="absolute inset-0 bg-[#111111]/70 backdrop-blur-sm"
            />

            {/* Side Sheet Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#111111] h-full shadow-2xl flex flex-col z-10 border-l border-slate-100 dark:border-white/5"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-[#3b82f6]/10 border border-blue-100 dark:border-[#3b82f6]/20 flex items-center justify-center text-blue-600 dark:text-[#3b82f6] shadow-sm shrink-0">
                    <FiBriefcase size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100  tracking-wider">
                      Task Workspace Preview
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold  tracking-wider mt-0.5">
                      Real-time Editing & Details
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-655 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Title Section (Autosaves on blur/enter) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400  tracking-wider">
                    Task Title
                  </label>
                  <div className="p-3 bg-slate-50 dark:bg-[#0a0a0a]/50 border border-slate-150 dark:border-white/10 rounded-xl focus-within:bg-white dark:focus-within:bg-[#111111] focus-within:ring-1 focus-within:ring-blue-500 dark:focus-within:ring-[#3b82f6] transition-all">
                    <TaskTitleInput
                      task={selectedTask}
                      canToggle={
                        isAdminOrManager ||
                        selectedTask.assignedTo?._id === currentUser?._id ||
                        selectedTask.assignedTo === currentUser?._id ||
                        selectedTask.createdBy?._id === currentUser?._id ||
                        selectedTask.createdBy === currentUser?._id
                      }
                      handleTaskFieldChange={handleTaskFieldChange}
                      isCompleted={selectedTask.status === "Completed"}
                    />
                  </div>
                </div>

                {/* Metadata Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-[#0a0a0a]/40 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                  {/* Status Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400  tracking-wider flex items-center gap-1.5">
                      <FiTag size={12} /> Status
                    </label>
                    {selectedTask.status === "Completed" ? (
                      <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Completed
                      </div>
                    ) : isAdminOrManager ? (
                      <select
                        value={selectedTask.status || "Not Started"}
                        onChange={(e) =>
                          handleTaskFieldChange(selectedTask._id, {
                            status: e.target.value,
                          })
                        }
                        className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#3b82f6]"
                      >
                        {selectedTask.contentType === "MOM" ? (
                            <>
                              <option value="Not Started" className="dark:bg-slate-950 dark:text-slate-200">Not Started</option>
                              {["In Progress", "On Hold", "In Review", "Correction"].includes(selectedTask.status) && (
                                <option value={selectedTask.status} className="dark:bg-slate-950 dark:text-slate-200">{selectedTask.status}</option>
                              )}
                              <option value="Completed" className="dark:bg-slate-950 dark:text-slate-200">Completed</option>
                            </>
                          ) : (
                            <>
                              <option value="Not Started" className="dark:bg-slate-950 dark:text-slate-200">Not Started</option>
                              {["In Progress", "On Hold", "In Review"].includes(selectedTask.status) && (
                                <option value={selectedTask.status} className="dark:bg-slate-950 dark:text-slate-200">{selectedTask.status}</option>
                              )}
                              <option value="Correction" className="dark:bg-slate-950 dark:text-slate-200">Correction</option>
                              <option value="Completed" className="dark:bg-slate-950 dark:text-slate-200">Completed</option>
                              <option value="Rejected" className="dark:bg-slate-950 dark:text-slate-200">Rejected</option>
                            </>
                          )}
                      </select>
                    ) : (
                      <div
                        className={`badge-span ${
                          selectedTask.status === "Completed"
                            ? "badge-status-completed"
                            : selectedTask.status === "In Progress"
                              ? "badge-status-in-progress"
                              : selectedTask.status === "IN-REVIEW" ||
                                  selectedTask.status === "In Review" ||
                                  selectedTask.status === "IN-Review"
                                ? "badge-status-in-review"
                                : selectedTask.status === "On Hold"
                                  ? "badge-status-on-hold"
                                  : selectedTask.status === "Rejected"
                                    ? "badge-status-rejected"
                                    : "badge-status-not-started"
                        }`}
                      >
                        {selectedTask.status === "IN-REVIEW" ||
                        selectedTask.status === "In Review" ||
                        selectedTask.status === "IN-Review"
                          ? "In Review"
                          : selectedTask.status || "Not Started"}
                      </div>
                    )}
                  </div>

                  {/* Assignee Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400  tracking-wider flex items-center gap-1.5">
                      <FiUser size={12} /> Assignee
                    </label>
                    <AssigneeDropdown
                      selectedUser={
                        selectedTask.contentType === "MOM"
                          ? selectedTask.assignedTo ||
                            selectedTask.createdBy?._id ||
                            selectedTask.createdBy?.id ||
                            selectedTask.createdBy ||
                            currentUser?._id ||
                            currentUser?.id
                          : selectedTask.assignedTo
                      }
                      users={users}
                      onChange={(userId) =>
                        handleTaskFieldChange(selectedTask._id, {
                          assignedTo: userId,
                        })
                      }
                      isAdminOrManager={isAdminOrManager}
                      disabled={selectedTask.contentType === "MOM"}
                      isLocked={selectedTask.contentType === "MOM"}
                      isMOM={selectedTask.contentType === "MOM"}
                      currentUser={currentUser}
                      getAvatarColor={getAvatarColor}
                      size="lg"
                    />
                  </div>

                  {/* Start Date Picker */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FiCalendar size={12} /> Start Date
                      </span>
                      {selectedTask.startDate && (
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
                          🔒 Locked
                        </span>
                      )}
                    </label>
                    {isAdminOrManager && !selectedTask.startDate ? (
                      <input
                        type="date"
                        value=""
                        onChange={(e) =>
                          handleTaskFieldChange(selectedTask._id, {
                            startDate: e.target.value,
                          })
                        }
                        className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#3b82f6]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/80 dark:bg-blue-955/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300">
                        <FiLock
                          className="text-amber-500 dark:text-amber-400 shrink-0"
                          size={13}
                        />
                        <span>
                          {selectedTask.startDate
                            ? new Date(
                                selectedTask.startDate,
                              ).toLocaleDateString()
                            : "N/A"}
                        </span>
                        {selectedTask.startDate && (
                          <span className="ml-auto text-[10px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider">
                            🔒 Locked
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* End Date (Due Date) Picker */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FiCalendar size={12} /> End Date
                      </span>
                      {selectedTask.dueDate && (
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
                          🔒 Locked
                        </span>
                      )}
                    </label>
                    {isAdminOrManager && !selectedTask.dueDate ? (
                      <input
                        type="date"
                        value=""
                        min={
                          selectedTask.startDate
                            ? new Date(selectedTask.startDate)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleTaskFieldChange(selectedTask._id, {
                            dueDate: e.target.value,
                          })
                        }
                        className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#3b82f6]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-rose-50/80 dark:bg-rose-955/30 border border-rose-200/80 dark:border-rose-900/60 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
                        <FiLock
                          className="text-amber-500 dark:text-amber-400 shrink-0"
                          size={13}
                        />
                        <span>
                          {selectedTask.dueDate
                            ? new Date(
                                selectedTask.dueDate,
                              ).toLocaleDateString()
                            : "N/A"}
                        </span>
                        {selectedTask.dueDate && (
                          <span className="ml-auto text-[10px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider">
                            🔒 Locked
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content Copy */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400  tracking-wider flex items-center gap-1.5">
                      <FiFileText size={12} /> Content Copy
                    </label>
                    <div className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl px-1 py-0.5">
                      <ContentCopyInput
                        value={selectedTask.contentCopy}
                        onChange={(newVal) =>
                          handleTaskFieldChange(selectedTask._id, {
                            contentCopy: newVal,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Priority Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400  tracking-wider flex items-center gap-1.5">
                      <FiClock size={12} /> Priority
                    </label>
                    {isSameDate(
                      selectedTask.startDate,
                      selectedTask.dueDate,
                    ) ? (
                      <div className="w-full pt-1">
                        <span className="badge-span badge-priority-top-high">
                          🔴 Top High
                        </span>
                      </div>
                    ) : isAdminOrManager ? (
                      <select
                        value={selectedTask.priority || "Medium"}
                        onChange={(e) =>
                          handleTaskFieldChange(selectedTask._id, {
                            priority: e.target.value,
                          })
                        }
                        className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-[#3b82f6]"
                      >
                        <option
                          value="Low"
                          className="dark:bg-[#111] dark:text-slate-200"
                        >
                          Low
                        </option>
                        <option
                          value="Medium"
                          className="dark:bg-slate-955 dark:text-slate-200"
                        >
                          Medium
                        </option>
                        <option
                          value="High"
                          className="dark:bg-slate-955 dark:text-slate-200"
                        >
                          High
                        </option>
                        <option
                          value="Top High"
                          className="dark:bg-red-950 dark:text-slate-200"
                        >
                          Top High
                        </option>
                      </select>
                    ) : (
                      <div
                        className={`px-3 py-2 border rounded-xl text-xs font-semibold w-fit ${
                          selectedTask.priority === "Top High"
                            ? "bg-red-50 text-red-650 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40"
                            : selectedTask.priority === "High"
                              ? "bg-rose-550/10 text-rose-700 border-rose-200/50"
                              : selectedTask.priority === "Medium"
                                ? "bg-amber-550/10 text-amber-700 border-amber-200/50"
                                : "bg-slate-50 text-slate-605 border-slate-200"
                        }`}
                      >
                        {selectedTask.priority || "Medium"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection History Display */}
                {selectedTask.rejectionHistory &&
                  selectedTask.rejectionHistory.length > 0 && (
                    <div className="bg-rose-50/50 dark:bg-rose-500/[0.02] border border-rose-100 dark:border-rose-500/10 rounded-2xl p-4 space-y-3">
                      <h3 className="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2">
                        <FiAlertTriangle size={14} /> Rejection History
                      </h3>
                      <div className="flex flex-col gap-2.5">
                        {selectedTask.rejectionHistory
                          .slice()
                          .reverse()
                          .map((item, idx) => {
                            const userObj = users?.find(
                              (u) =>
                                u._id ===
                                (item.rejectedBy?._id || item.rejectedBy),
                            );
                            const userName =
                              item.rejectedBy?.name ||
                              userObj?.name ||
                              "Unknown User";
                            return (
                              <div
                                key={idx}
                                className="bg-white dark:bg-[#111111] border border-rose-100/50 dark:border-rose-500/10 rounded-xl p-3"
                              >
                                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                  "{item.reason}"
                                </p>
                                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                  <span className="flex items-center gap-1.5">
                                    <FiUser size={10} />
                                    {userName}
                                  </span>
                                  <span>
                                    {new Date(item.rejectedAt).toLocaleString(
                                      undefined,
                                      {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                {/* Metrics Showcase (Revisions & Time Tracker) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Approval Info Card */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-900/20 border border-blue-100/50 dark:border-blue-500/10 rounded-2xl p-4 group transition-all hover:shadow-lg hover:shadow-blue-500/5">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500 blur-xl" />
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#111] shadow-sm flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <FiClock size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Approval Info
                      </h3>
                    </div>
                    <div className="relative z-10 flex flex-col gap-2.5 text-[10px] mt-2.5">
                      {(() => {
                        const drawerEffectiveReviewStart =
                          selectedTask.reviewStartedAt ||
                          selectedTask.lastReviewStartedAt ||
                          (selectedTask.reviewCycles &&
                          selectedTask.reviewCycles.length > 0
                            ? selectedTask.reviewCycles[
                                selectedTask.reviewCycles.length - 1
                              ]?.startedAt
                            : null);

                        if (drawerEffectiveReviewStart) {
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                                Review Start
                              </span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {new Date(
                                  drawerEffectiveReviewStart,
                                ).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                })}{" "}
                                ·{" "}
                                {new Date(
                                  drawerEffectiveReviewStart,
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                              Review Start
                            </span>
                            <span className="font-semibold text-slate-400 dark:text-slate-550">
                              Not started
                            </span>
                          </div>
                        );
                      })()}

                      {selectedTask.completedAt ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-450 uppercase tracking-widest">
                            Completed At
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {new Date(
                              selectedTask.completedAt,
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}{" "}
                            ·{" "}
                            {new Date(
                              selectedTask.completedAt,
                            ).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            Completed At
                          </span>
                          <span className="font-semibold text-slate-400 dark:text-slate-550">
                            Not Started
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total Productivity Card */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-900/20 border border-emerald-100/50 dark:border-emerald-500/10 rounded-2xl p-5 group transition-all hover:shadow-lg hover:shadow-emerald-500/5">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500 blur-xl" />
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#111] shadow-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <FiActivity size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Total Productivity
                      </h3>
                    </div>
                    <div className="relative z-10">
                      {(() => {
                        if (!selectedTask.actualStartTime) {
                          return (
                            <span className="text-slate-400 dark:text-slate-500 text-sm font-bold">
                              —
                            </span>
                          );
                        }
                        const start = new Date(
                          selectedTask.actualStartTime,
                        ).getTime();
                        const end = selectedTask.actualEndTime
                          ? new Date(selectedTask.actualEndTime).getTime()
                          : selectedTask.pausedAt
                            ? new Date(selectedTask.pausedAt).getTime()
                            : Date.now();
                        const pausedMs = selectedTask.totalPausedMs || 0;
                        const workedMs = Math.max(0, end - start - pausedMs);
                        const totalSecs = Math.floor(workedMs / 1000);
                        const h = Math.floor(totalSecs / 3600);
                        const m = Math.floor((totalSecs % 3600) / 60);
                        const s = totalSecs % 60;
                        const isActive =
                          selectedTask.status === "In Progress" &&
                          !selectedTask.actualEndTime &&
                          !selectedTask.pausedAt;
                        return (
                          <div className="flex items-baseline gap-1 text-slate-800 dark:text-white">
                            {h > 0 && (
                              <>
                                <span className="text-3xl font-black tracking-tight">
                                  {h}
                                </span>
                                <span className="text-xs font-bold text-slate-400 mr-1">
                                  h
                                </span>
                              </>
                            )}
                            <span className="text-3xl font-black tracking-tight">
                              {m}
                            </span>
                            <span className="text-xs font-bold text-slate-400 mr-1">
                              m
                            </span>
                            <span className="text-xl font-black tracking-tight text-emerald-500 dark:text-emerald-400">
                              {s}
                            </span>
                            <span className="text-xs font-bold text-emerald-400">
                              s
                            </span>
                            {isActive && (
                              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 self-center" />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Time Log */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
                    <div className="flex items-center gap-2.5 mb-2 pb-1.5 border-b border-slate-100 dark:border-white/5">
                      <FiClock size={16} className="text-slate-400" />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Time Log
                      </h3>
                    </div>
                    {(!selectedTask.statusHistory || selectedTask.statusHistory.length === 0) ? (
                      <p className="text-xs text-slate-500 italic">No time logs yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] text-left">
                          <thead>
                            <tr className="text-slate-500 font-semibold border-b border-slate-100 dark:border-white/5">
                              <th className="py-1">Date</th>
                              <th className="py-1">User</th>
                              <th className="py-1">Status</th>
                              <th className="py-1 text-right">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTask.statusHistory.slice().reverse().map((h, i) => {
                              const date = h.date || (h.startTime ? new Date(h.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-");
                              const user = h.user?.name || h.user?.firstName || "Unknown";
                              const status = h.status;
                              let dur = h.duration || 0;
                              if (dur === 0 && h.startTime && h.endTime) {
                                dur = new Date(h.endTime).getTime() - new Date(h.startTime).getTime();
                              }
                              if (dur === 0 && !h.endTime && h.startTime && (h.status === "In Progress" || h.status === "On Hold" || h.status === "Correction")) {
                                const endMs = selectedTask.pausedAt ? new Date(selectedTask.pausedAt).getTime() : Date.now();
                                dur = Math.max(0, endMs - new Date(h.startTime).getTime());
                              }
                              return (
                                <tr key={i} className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5">
                                  <td className="py-1.5 font-medium text-slate-600 dark:text-slate-300">{date}</td>
                                  <td className="py-1.5 text-slate-600 dark:text-slate-400">{user}</td>
                                  <td className="py-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      status === "In Progress" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                                      status === "On Hold" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                                      status === "Correction" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" :
                                      "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                                    }`}>{status}</span>
                                  </td>
                                  <td className="py-1.5 text-right font-mono font-bold text-slate-700 dark:text-slate-200">
                                    {dur > 0 ? formatShortDuration(dur) : "0s"}
                                    {!h.endTime && <span className="ml-1 text-emerald-500 animate-pulse">●</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Asana-style Subtask Workspace ── */}
                <div
                  id="drawer-subtasks-section"
                  className="pt-4 border-t border-slate-100 dark:border-white/5"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Subtasks
                      </h3>
                      <span className="px-2 py-2 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                        {
                          (selectedTask.subtasks || []).filter(
                            (s) => s.status === "Completed",
                          ).length
                        }
                        /{selectedTask.subtasks?.length || 0}
                      </span>
                      {isAdminOrManager && (
                        <button
                          onClick={async () => {
                            const updatedSubtasks = [
                              ...(selectedTask.subtasks || []),
                            ];
                            const newSubtask = {
                              title: "",
                              status: "Not Started",
                              assignedTo: null,
                              dueDate: null,
                              priority: "Medium",
                            };
                            updatedSubtasks.push(newSubtask);
                            setAutoFocusDrawerSubtaskIdx(
                              updatedSubtasks.length - 1,
                            );
                            try {
                              await updateTaskMutation({
                                id: selectedTask._id,
                                taskData: { subtasks: updatedSubtasks },
                              }).unwrap();
                            } catch (err) {
                              console.error("Failed to add subtask:", err);
                            }
                          }}
                          className="p-1 hover:bg-slate-150 dark:hover:bg-white/5 rounded text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-[#3b82f6] transition-colors cursor-pointer"
                          title="Add subtask"
                        >
                          <FiPlus size={16} />
                        </button>
                      )}
                    </div>
                    <button className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-400 hover:text-slate-655 dark:text-slate-500 dark:hover:text-slate-350 transition-colors">
                      <FiSliders size={14} />
                    </button>
                  </div>

                  {/* Subtask rows — Asana style */}
                  <div className="rounded-xl border border-slate-150 dark:border-white/10 overflow-hidden bg-white dark:bg-[#0b0b0b] divide-y divide-slate-100/80 dark:divide-white/5 shadow-md shadow-slate-100 dark:shadow-none">
                    {/* Empty state */}
                    {(!selectedTask.subtasks ||
                      selectedTask.subtasks.length === 0) && (
                      <div className="flex flex-col items-center gap-2 py-8 text-slate-450 dark:text-slate-550">
                        <FiCornerDownRight size={22} strokeWidth={1.5} />
                        <span className="text-[11px] font-semibold">
                          No subtasks yet
                        </span>
                        <span className="text-[10px] opacity-70">
                          Add a subtask below to break this task down
                        </span>
                      </div>
                    )}

                    {/* Subtask rows */}
                    {(selectedTask.subtasks || []).map((sub, subIdx) => {
                      const isSubDone = sub.status === "Completed";
                      const canEdit =
                        isAdminOrManager ||
                        sub.assignedTo?._id === currentUser?._id ||
                        sub.assignedTo === currentUser?._id;
                      return (
                        <SubtaskRow
                          key={sub._id || subIdx}
                          sub={sub}
                          task={selectedTask}
                          users={users}
                          getAvatarColor={getAvatarColor}
                          handleSubtaskFieldChange={handleSubtaskFieldChange}
                          handleDeleteSubtask={handleDeleteSubtask}
                          isAdminOrManager={isAdminOrManager}
                          currentUser={currentUser}
                          subIdx={subIdx}
                          handleSubtaskEnterKey={handleSubtaskEnterKey}
                          shouldAutoFocus={autoFocusDrawerSubtaskIdx === subIdx}
                          onAutoFocused={() =>
                            setAutoFocusDrawerSubtaskIdx(null)
                          }
                        />
                      );
                    })}

                    {/* Add Subtask trigger button at bottom */}
                    {isAdminOrManager && (
                      <button
                        onClick={async () => {
                          const updatedSubtasks = [
                            ...(selectedTask.subtasks || []),
                          ];
                          const newSubtask = {
                            title: "",
                            status: "Not Started",
                            assignedTo: null,
                            dueDate: null,
                            priority: "Medium",
                          };
                          updatedSubtasks.push(newSubtask);
                          setAutoFocusDrawerSubtaskIdx(
                            updatedSubtasks.length - 1,
                          );
                          try {
                            await updateTaskMutation({
                              id: selectedTask._id,
                              taskData: { subtasks: updatedSubtasks },
                            }).unwrap();
                          } catch (err) {
                            console.error("Failed to add subtask:", err);
                          }
                        }}
                        className="w-full text-left px-3.5 py-2 text-[11px] font-bold text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-[#3b82f6] hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all flex items-center gap-1.5 cursor-pointer border-t border-slate-100 dark:border-white/5"
                      >
                        <FiPlus size={12} />
                        Add subtask
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* SUBMIT FOR REVIEW CONFIRMATION MODAL */}
      <AnimatePresence>
        {reviewModalData && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-[#11131f] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FiCheckSquare size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    Submit Task for Review?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                    Are you sure you want to submit this item for review? Once
                    submitted, the status will update to{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                      "In Review"
                    </strong>{" "}
                    and your manager will be notified.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setReviewModalData(null)}
                  className="px-4.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReviewSubmit}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <FiCheckSquare size={14} />
                  Submit for Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MARK AS COMPLETED CONFIRMATION MODAL */}
      <AnimatePresence>
        {completeModalData && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-[#11131f] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FiCheckCircle size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    Mark Task as Completed?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">
                    Are you sure you want to mark the following task as
                    completed?
                  </p>
                  <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40">
                    <p className="text-[10px] font-black text-emerald-500 dark:text-emerald-500 uppercase tracking-widest mb-1">
                      Task Name
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug break-words">
                      {completeModalData.taskName || "Untitled Task"}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2.5 leading-relaxed">
                    Once completed, the task status will be updated to{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      "Completed"
                    </strong>{" "}
                    and tracked in your project timeline.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setCompleteModalData(null)}
                  className="px-4.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmComplete}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <FiCheckCircle size={14} />
                  Mark as Completed
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RejectionModal
        isOpen={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setTaskToReject(null);
        }}
        onSubmit={handleRejectSubmit}
        task={taskToReject?.taskObj}
        subtaskId={taskToReject?.subtaskId}
        users={users}
      />

      <CorrectionModal
        isOpen={correctionModalOpen}
        onClose={() => {
          setCorrectionModalOpen(false);
          setTaskToCorrect(null);
        }}
        onSubmit={handleCorrectionSubmit}
        task={taskToCorrect?.taskObj}
        subtaskId={taskToCorrect?.subtaskId}
        users={users}
      />
    </div>
  );
};

export default ProjectTaskBoard;
