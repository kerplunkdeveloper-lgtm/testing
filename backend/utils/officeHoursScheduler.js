const Task = require("../models/Task");
const OfficeSettings = require("../models/OfficeSettings");

async function checkAndAutoPauseTasks(io) {
  try {
    let settings = await OfficeSettings.findOne({ key: "global" });
    if (!settings) {
      settings = { startHour: 9, endHour: 19 };
    }

    const now = new Date();
    const day = now.getDay();
    const currentHour = now.getHours();

    const isWeekend = day === 0 || day === 6;
    const isOutsideHours = currentHour >= settings.endHour || currentHour < settings.startHour;

    if (isWeekend || isOutsideHours) {
      // Find tasks in progress
      const activeTasks = await Task.find({ status: "In Progress" });
      
      let pauseTime = new Date();
      if (currentHour >= settings.endHour) {
        pauseTime.setHours(settings.endHour, 0, 0, 0);
      }

      for (let task of activeTasks) {
        task.status = "On Hold";
        task.pausedAt = pauseTime;
        task.autoPaused = true;
        await task.save();
        
        console.log(`Auto-paused task: "${task.title}" at ${pauseTime}`);
        if (io) {
          io.emit("task_updated", { taskId: task._id });
        }
      }

      // Find tasks with subtasks in progress
      const tasksWithActiveSubtasks = await Task.find({ "subtasks.status": "In Progress" });
      for (let task of tasksWithActiveSubtasks) {
        let updated = false;
        task.subtasks = task.subtasks.map(sub => {
          if (sub.status === "In Progress") {
            sub.status = "On Hold";
            sub.pausedAt = pauseTime;
            sub.autoPaused = true;
            updated = true;
            console.log(`Auto-paused subtask: "${sub.title}" in task "${task.title}"`);
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
  // Check every 60 seconds
  setInterval(() => {
    const io = app.get("io");
    checkAndAutoPauseTasks(io);
  }, 60 * 1000);
}

module.exports = { startOfficeHoursScheduler, checkAndAutoPauseTasks };
