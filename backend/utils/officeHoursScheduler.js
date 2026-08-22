const Task = require("../models/Task");
const OfficeSettings = require("../models/OfficeSettings");
const { getISTDateParts, calculateBusinessMs } = require("./businessHours");

async function checkAndAutoPauseTasks(io) {
  try {
    let settings = await OfficeSettings.findOne({ key: "global" });
    if (!settings) {
      settings = await OfficeSettings.create({
        key: "global",
        startHour: 9,
        endHour: 19,
        workingDays: [1, 2, 3, 4, 5, 6],
      });
    }

    const workingDays = settings.workingDays && settings.workingDays.length > 0
      ? settings.workingDays
      : [1, 2, 3, 4, 5, 6];
    const startHour = settings.startHour ?? 9;
    const endHour = settings.endHour ?? 19;

    const now = new Date();
    const { day, hour: currentHour } = getISTDateParts(now);

    const isNonWorkingDay = !workingDays.includes(day);
    const isOutsideHours = currentHour >= endHour || currentHour < startHour;
    const isOutsideBusiness = isNonWorkingDay || isOutsideHours;

    if (isOutsideBusiness) {
      // OUTSIDE OFFICE HOURS -> Auto-pause active tasks (status becomes "On Hold", autoPaused = true)
      const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const hourStr = String(endHour).padStart(2, "0");
      let pauseTime = new Date(`${dateStr}T${hourStr}:00:00+05:30`);
      if (pauseTime > now) {
        pauseTime = new Date(now);
      }
      const pauseTimeMs = pauseTime.getTime();

      // 1. Parent tasks with status "In Progress"
      const activeTasks = await Task.find({ status: "In Progress" });

      for (let task of activeTasks) {
        if (task.status === "In Progress") {
          // Calculate session working time
          let sessionWorkedMs = 0;
          if (task.actualStartTime) {
            const sStart = new Date(task.actualStartTime).getTime();
            if (pauseTimeMs > sStart) {
              let sessionPauses = 0;
              if (task.blockerHistory && Array.isArray(task.blockerHistory)) {
                task.blockerHistory.forEach(h => {
                  if (h.pausedAt) {
                    const p = new Date(h.pausedAt).getTime();
                    let r = h.resumedAt ? new Date(h.resumedAt).getTime() : pauseTimeMs;
                    if (r > pauseTimeMs) r = pauseTimeMs;
                    const oStart = Math.max(p, sStart);
                    const oEnd = Math.min(r, pauseTimeMs);
                    if (oEnd > oStart) sessionPauses += (oEnd - oStart);
                  }
                });
              }
              if (task.isBlocked && task.blockerPausedAt) {
                const p = new Date(task.blockerPausedAt).getTime();
                const oStart = Math.max(p, sStart);
                if (pauseTimeMs > oStart) sessionPauses += (pauseTimeMs - oStart);
              }
              sessionWorkedMs = Math.max(0, pauseTimeMs - sStart - sessionPauses);
            }
          }

          task.totalTrackedTime = (task.totalTrackedTime || 0) + sessionWorkedMs;
          task.dailyTrackedTime = (task.dailyTrackedTime || 0) + sessionWorkedMs;

          let history = task.statusHistory ? JSON.parse(JSON.stringify(task.statusHistory)) : [];
          // Close open In Progress entry
          for (let i = history.length - 1; i >= 0; i--) {
            if (!history[i].endTime && history[i].status === "In Progress") {
              history[i].endTime = pauseTime;
              history[i].duration = Math.max(0, Math.round(sessionWorkedMs));
              break;
            }
          }

          // Add On Hold entry
          history.push({
            status: "On Hold",
            startTime: pauseTime,
            endTime: null,
            duration: 0,
            date: dateStr,
            user: task.assignedTo,
            comment: "Auto-paused at EOD",
          });
          task.statusHistory = history;
        }

        task.status = "On Hold";
        task.pausedAt = task.pausedAt || pauseTime;
        task.holdStartedAt = task.holdStartedAt || pauseTime;
        task.autoPaused = true;
        await task.save();
        
        console.log(`Auto-paused task (moved to On Hold): "${task.title}" at ${task.pausedAt}`);
        if (io) {
          io.emit("task_updated", { taskId: task._id });
        }
      }

      // 2. Subtasks in progress
      const tasksWithActiveSubtasks = await Task.find({ "subtasks.status": "In Progress" });

      for (let task of tasksWithActiveSubtasks) {
        let updated = false;
        task.subtasks = task.subtasks.map(sub => {
          if (sub.status === "In Progress") {
            let sessionWorkedMs = 0;
            if (sub.actualStartTime) {
              const sStart = new Date(sub.actualStartTime).getTime();
              if (pauseTimeMs > sStart) {
                let sessionPauses = 0;
                if (sub.blockerHistory && Array.isArray(sub.blockerHistory)) {
                  sub.blockerHistory.forEach(h => {
                    if (h.pausedAt) {
                      const p = new Date(h.pausedAt).getTime();
                      let r = h.resumedAt ? new Date(h.resumedAt).getTime() : pauseTimeMs;
                      if (r > pauseTimeMs) r = pauseTimeMs;
                      const oStart = Math.max(p, sStart);
                      const oEnd = Math.min(r, pauseTimeMs);
                      if (oEnd > oStart) sessionPauses += (oEnd - oStart);
                    }
                  });
                }
                if (sub.isBlocked && sub.blockerPausedAt) {
                  const p = new Date(sub.blockerPausedAt).getTime();
                  const oStart = Math.max(p, sStart);
                  if (pauseTimeMs > oStart) sessionPauses += (pauseTimeMs - oStart);
                }
                sessionWorkedMs = Math.max(0, pauseTimeMs - sStart - sessionPauses);
              }
            }

            sub.totalTrackedTime = (sub.totalTrackedTime || 0) + sessionWorkedMs;
            sub.dailyTrackedTime = (sub.dailyTrackedTime || 0) + sessionWorkedMs;

            let history = sub.statusHistory ? JSON.parse(JSON.stringify(sub.statusHistory)) : [];
            for (let i = history.length - 1; i >= 0; i--) {
              if (!history[i].endTime && history[i].status === "In Progress") {
                history[i].endTime = pauseTime;
                history[i].duration = Math.max(0, Math.round(sessionWorkedMs));
                break;
              }
            }

            history.push({
              status: "On Hold",
              startTime: pauseTime,
              endTime: null,
              duration: 0,
              date: dateStr,
              user: sub.assignedTo,
              comment: "Auto-paused at EOD",
            });
            sub.statusHistory = history;

            sub.status = "On Hold";
            sub.pausedAt = sub.pausedAt || pauseTime;
            sub.holdStartedAt = sub.holdStartedAt || pauseTime;
            sub.autoPaused = true;
            updated = true;
            console.log(`Auto-paused subtask (moved to On Hold): "${sub.title}" in task "${task.title}"`);
          } else if (sub.status === "On Hold" && sub.autoPaused) {
            sub.pausedAt = sub.pausedAt || pauseTime;
            sub.holdStartedAt = sub.holdStartedAt || pauseTime;
          }
          return sub;
        });

        if (updated) {
          await task.save();
          if (io) {
            io.emit("task_updated", { taskId: task._id });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error in checkAndAutoPauseTasks background worker:", err);
  }
}

function startOfficeHoursScheduler(app) {
  // Run check immediately at server start
  const io = app.get("io");
  checkAndAutoPauseTasks(io);

  // Check every 60 seconds
  setInterval(() => {
    const currentIo = app.get("io");
    checkAndAutoPauseTasks(currentIo);
  }, 60 * 1000);
}

module.exports = { startOfficeHoursScheduler, checkAndAutoPauseTasks };

