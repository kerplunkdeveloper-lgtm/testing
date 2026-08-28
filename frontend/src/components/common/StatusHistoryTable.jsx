import React from "react";
import {
  FiClock,
  FiActivity,
  FiUser,
  FiCalendar,
  FiPlay,
  FiPause,
  FiCheckCircle,
  FiAlertTriangle,
  FiEdit3,
  FiEye,
} from "react-icons/fi";

export const formatDuration = (ms = 0) => {
  if (!ms || isNaN(ms) || ms < 0) return "0h 00m";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  }
  if (m > 0) {
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${s}s`;
};

export const formatTimeOnly = (dateVal) => {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  } catch (e) {
    return "—";
  }
};

export const formatDateOnly = (dateVal, fallbackDateStr = "") => {
  if (
    fallbackDateStr &&
    typeof fallbackDateStr === "string" &&
    fallbackDateStr.length > 3
  ) {
    return fallbackDateStr;
  }
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallbackDateStr || "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return fallbackDateStr || "—";
  }
};

export const getStatusBadge = (status) => {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "in progress":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <FiPlay size={10} className="animate-pulse" /> In Progress
        </span>
      );
    case "on hold":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <FiPause size={10} /> On Hold
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
          <FiClock size={10} /> Pending
        </span>
      );
    case "in review":
    case "in-review":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <FiEye size={10} /> In Review
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <FiCheckCircle size={10} /> Completed
        </span>
      );
    case "correction":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
          <FiEdit3 size={10} /> Correction
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <FiAlertTriangle size={10} /> Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
          {status || "Not Started"}
        </span>
      );
  }
};

const StatusHistoryTable = ({ task, todayLoggedMs = 0 }) => {
  if (!task) return null;

  const statusHistory = task.statusHistory || [];
  const totalLifetimeMs = task.totalTrackedTime || 0;

  // Calculate today's tracked time from today's statusHistory entries + any active session
  const todayDateStr = new Date().toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
  });

  const todayHistoryWorkedMs = statusHistory
    .filter((h) => {
      if (h.status !== "In Progress") return false;
      const d = h.startTime ? new Date(h.startTime) : (h.date ? new Date(h.date) : null);
      if (!d || isNaN(d.getTime())) return false;
      const hDateStr = d.toLocaleDateString("en-US", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "numeric",
      });
      return hDateStr === todayDateStr;
    })
    .reduce((acc, curr) => acc + (curr.duration || 0), 0);

  const displayTodayMs =
    todayLoggedMs > 0 ? todayLoggedMs : todayHistoryWorkedMs;

  return (
    <div className="space-y-4">
      {/* Summary Time Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200/60 dark:border-blue-800/40 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <FiActivity size={12} /> Today's Productivity
            </span>
            {task.status === "In Progress" && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse" />
            )}
          </div>
          <div className="text-lg font-black text-slate-800 dark:text-slate-100">
            {formatDuration(displayTodayMs)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
            Resets daily for accurate day tracking
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/80 to-pink-50/40 dark:from-purple-950/20 dark:to-pink-950/10 border border-purple-200/60 dark:border-purple-800/40 space-y-1">
          <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
            <FiClock size={12} /> Total Tracked Time
          </span>
          <div className="text-lg font-black text-slate-800 dark:text-slate-100">
            {formatDuration(
              totalLifetimeMs +
                (task.status === "In Progress" ? displayTodayMs : 0),
            )}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
            Lifetime accumulated working time
          </div>
        </div>
      </div>

      {/* Status History Table */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiCalendar
              size={14}
              className="text-slate-500 dark:text-slate-400"
            />
            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Status & Time History ({statusHistory.length})
            </span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
            Preserved across working days
          </span>
        </div>

        {statusHistory.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
            No history recorded yet for this task.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-60 scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-2">Date</th>
                  <th className="px-3.5 py-2">Status</th>
                  <th className="px-3.5 py-2">Start Time</th>
                  <th className="px-3.5 py-2">End Time</th>
                  <th className="px-3.5 py-2">Hold Reason</th>
                  <th className="px-3.5 py-2 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {statusHistory
                  .slice()
                  .reverse()
                  .map((item, idx) => {
                    const dateStr = formatDateOnly(item.startTime, item.date);
                    const startStr = formatTimeOnly(item.startTime);
                    const endStr = item.endTime
                      ? formatTimeOnly(item.endTime)
                      : item.status === task.status
                        ? "Current"
                        : "—";
                    const durationStr =
                      item.duration > 0
                        ? formatDuration(item.duration)
                        : item.status === "In Progress" && !item.endTime
                          ? "Running"
                          : "0h 00m";

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          {dateStr}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">
                          {startStr}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">
                          {endStr}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400">
                          {item.reason || "—"}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-[11px] font-black text-right text-slate-800 dark:text-slate-100">
                          {durationStr}
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
  );
};

export default StatusHistoryTable;
