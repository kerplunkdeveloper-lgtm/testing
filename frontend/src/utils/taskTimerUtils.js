import { parseISO, isSameDay } from "date-fns";

/**
 * Calculates working time (in ms) within business hours between two timestamps in IST.
 */
export function calculateBusinessMsBetween(
  startDate,
  endDate,
  officeHours = { startHour: 9, endHour: 19, workingDays: [1, 2, 3, 4, 5, 6] }
) {
  if (!startDate || !endDate) return 0;
  let start = new Date(startDate).getTime();
  let end = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end) || start >= end) return 0;

  const startHour = officeHours?.startHour ?? 9;
  const endHour = officeHours?.endHour ?? 19;
  const breakStartHour = officeHours?.breakStartHour ?? 13;
  const breakEndHour = officeHours?.breakEndHour ?? 14;
  const workingDays = officeHours?.workingDays || [1, 2, 3, 4, 5, 6];

  const IST_OFFSET = 330 * 60 * 1000; // +5:30 IST offset
  let totalMs = 0;
  let curTime = start;

  while (curTime < end) {
    const curIST = new Date(curTime + IST_OFFSET);
    const day = curIST.getUTCDay();
    const hour = curIST.getUTCHours();
    const min = curIST.getUTCMinutes();
    const sec = curIST.getUTCSeconds();
    const ms = curIST.getUTCMilliseconds();

    if (!workingDays.includes(day)) {
      const msToday = (hour * 3600 + min * 60 + sec) * 1000 + ms;
      curTime += 24 * 3600 * 1000 - msToday;
      continue;
    }

    if (hour < startHour) {
      const msUntilStart = ((startHour - hour) * 3600 - min * 60 - sec) * 1000 - ms;
      curTime += msUntilStart;
      continue;
    }

    if (hour >= endHour) {
      const msToday = (hour * 3600 + min * 60 + sec) * 1000 + ms;
      curTime += 24 * 3600 * 1000 - msToday;
      continue;
    }

    const curBlockEndIST = new Date(curIST);
    curBlockEndIST.setUTCHours(endHour, 0, 0, 0);
    const curBlockEndTime = curBlockEndIST.getTime() - IST_OFFSET;

    const breakStartIST = new Date(curIST);
    breakStartIST.setUTCHours(breakStartHour, 0, 0, 0);
    const breakStartTime = breakStartIST.getTime() - IST_OFFSET;

    const breakEndIST = new Date(curIST);
    breakEndIST.setUTCHours(breakEndHour, 0, 0, 0);
    const breakEndTime = breakEndIST.getTime() - IST_OFFSET;

    if (hour >= breakStartHour && hour < breakEndHour) {
      const msUntilBreakEnd = ((breakEndHour - hour) * 3600 - min * 60 - sec) * 1000 - ms;
      curTime += msUntilBreakEnd;
      continue;
    }

    let blockEndTime = curBlockEndTime;
    if (hour < breakStartHour) {
      blockEndTime = Math.min(curBlockEndTime, breakStartTime);
    }
    
    const blockEnd = Math.min(end, blockEndTime);
    totalMs += blockEnd - curTime;
    curTime = blockEnd;
  }

  return totalMs;
}

/**
 * Calculates current active session working time for a task currently In Progress.
 */
export function getCurrentActiveSessionMs(
  task,
  nowMs = Date.now(),
  officeHours = { startHour: 9, endHour: 19, workingDays: [1, 2, 3, 4, 5, 6] }
) {
  if (!task || task.status !== "In Progress" || task.autoPaused) return 0;
  if (!task.actualStartTime) return 0;

  const startMs = new Date(task.actualStartTime).getTime();
  if (isNaN(startMs) || startMs >= nowMs) return 0;

  const workedMs = calculateBusinessMsBetween(startMs, nowMs, officeHours);

  let blockerPauseMs = 0;
  if (task.blockerHistory && Array.isArray(task.blockerHistory)) {
    task.blockerHistory.forEach((b) => {
      if (b.pausedAt) {
        const p = new Date(b.pausedAt).getTime();
        const r = b.resumedAt ? new Date(b.resumedAt).getTime() : nowMs;
        const oStart = Math.max(p, startMs);
        const oEnd = Math.min(r, nowMs);
        if (oEnd > oStart) {
          blockerPauseMs += oEnd - oStart;
        }
      }
    });
  }

  if (task.isBlocked && task.blockerPausedAt) {
    const p = new Date(task.blockerPausedAt).getTime();
    const oStart = Math.max(p, startMs);
    if (nowMs > oStart) {
      blockerPauseMs += nowMs - oStart;
    }
  }

  return Math.max(0, workedMs - blockerPauseMs);
}

/**
 * Calculates today's productivity in milliseconds for a task.
 * Formula: Today's accumulated work + Current active session (if active today).
 */
export function getTodayProductivityMs(
  task,
  now = new Date(),
  officeHours = { startHour: 9, endHour: 19, workingDays: [1, 2, 3, 4, 5, 6] }
) {
  if (!task) return 0;

  let subtasksMs = 0;
  if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    task.subtasks.forEach((sub) => {
      subtasksMs += getTodayProductivityMs(sub, now, officeHours);
    });
  }

  const todayStr = new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  let historyTodayMs = 0;
  if (task.statusHistory && Array.isArray(task.statusHistory)) {
    task.statusHistory.forEach((h) => {
      if (h.status !== "In Progress") return;
      let entryDate = h.date;
      if (!entryDate && h.startTime) {
        entryDate = new Date(h.startTime).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      }
      if (entryDate !== todayStr) return;

      if (h.duration > 0) {
        historyTodayMs += h.duration;
      } else if (h.endTime) {
        const dur = calculateBusinessMsBetween(h.startTime, h.endTime, officeHours);
        historyTodayMs += dur;
      }
    });
  }

  const lastSessionDateStr = task.actualStartTime
    ? new Date(task.actualStartTime).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
    : null;
  const isSameDaySession = lastSessionDateStr === todayStr;

  const baseTodayMs = Math.max(
    historyTodayMs,
    isSameDaySession ? (task.dailyTrackedTime || 0) : 0
  );

  let activeSessionMs = 0;
  if (task.status === "In Progress" && !task.autoPaused) {
    if (isSameDaySession) {
      activeSessionMs = getCurrentActiveSessionMs(task, new Date(now).getTime(), officeHours);
    }
  }

  return Math.max(0, baseTodayMs + activeSessionMs) + subtasksMs;
}

/**
 * Calculates total task tracked time in milliseconds across all days.
 * Formula: Total accumulated work + Current active session (if active).
 */
export function getTotalTrackedMs(
  task,
  now = new Date(),
  officeHours = { startHour: 9, endHour: 19, workingDays: [1, 2, 3, 4, 5, 6] }
) {
  if (!task) return 0;

  let subtasksMs = 0;
  if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    task.subtasks.forEach((sub) => {
      subtasksMs += getTotalTrackedMs(sub, now, officeHours);
    });
  }

  const baseTotalMs = task.totalTrackedTime || 0;
  let activeSessionMs = 0;

  if (task.status === "In Progress" && !task.autoPaused) {
    activeSessionMs = getCurrentActiveSessionMs(task, new Date(now).getTime(), officeHours);
  }

  return Math.max(0, baseTotalMs + activeSessionMs) + subtasksMs;
}

export function getStatusTrackedMs(
  task,
  targetStatus,
  now = new Date(),
  officeHours = { startHour: 9, endHour: 19, workingDays: [1, 2, 3, 4, 5, 6] }
) {
  if (!task) return 0;

  let subtasksMs = 0;
  if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    task.subtasks.forEach((sub) => {
      subtasksMs += getStatusTrackedMs(sub, targetStatus, now, officeHours);
    });
  }

  let totalMs = 0;
  let hasOpenSession = false;
  let openSessionStart = null;

  if (task.statusHistory && Array.isArray(task.statusHistory)) {
    task.statusHistory.forEach((h) => {
      if (h.status === targetStatus) {
        if (h.endTime) {
          totalMs += h.duration || 0;
        } else {
          hasOpenSession = true;
          openSessionStart = h.startTime;
        }
      }
    });
  }

  if (hasOpenSession && openSessionStart && task.status === targetStatus) {
    const startMs = new Date(openSessionStart).getTime();
    let endMs = new Date(now).getTime();
    if (task.pausedAt) {
      endMs = new Date(task.pausedAt).getTime();
    }
    if (endMs > startMs) {
      totalMs += calculateBusinessMsBetween(startMs, endMs, officeHours);
    }
  }

  return totalMs + subtasksMs;
}

/**
 * Format milliseconds into HH:MM:SS
 */
export function formatHMS(ms) {
  const totalSecs = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Format milliseconds into human readable short string (e.g., "3h 15m" or "00:00:00")
 */
export function formatShortDuration(ms) {
  if (!ms || ms <= 0) return "00:00:00";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}
