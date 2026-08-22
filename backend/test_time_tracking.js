const mongoose = require("mongoose");
const { handleItemStatusTransition, calculateSessionWorkingTime } = require("./controllers/taskController");
const { calculateBusinessMs } = require("./utils/businessHours");

async function runTests() {
  console.log("================================================================================");
  console.log("STARTING TIME TRACKING & ON-HOLD LIFECYCLE TESTS");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  const officeSettings = {
    startHour: 9,
    endHour: 19,
    workingDays: [1, 2, 3, 4, 5, 6],
  };

  const userId = new mongoose.Types.ObjectId();

  // Test 1: Day 1 Starting Task (Pending -> In Progress)
  console.log("\n--- TEST 1: DAY 1 Task Start (Pending -> In Progress) ---");
  const task = {
    _id: new mongoose.Types.ObjectId(),
    title: "Website Hero Banner",
    status: "Pending",
    totalTrackedTime: 0,
    dailyTrackedTime: 0,
    statusHistory: [
      {
        status: "Pending",
        startTime: new Date("2026-08-19T09:00:00+05:30"),
        endTime: null,
        duration: 0,
        date: "2026-08-19",
      }
    ]
  };

  // Start task at 10:00 AM on Day 1
  const day1StartTime = new Date("2026-08-19T10:00:00+05:30");
  // Temporarily override Date.now for predictable test execution
  const origNow = Date.now;
  Date.now = () => day1StartTime.getTime();

  handleItemStatusTransition(task, "Pending", "In Progress", userId, officeSettings);

  assert(task.status === "In Progress", "Task status is 'In Progress'");
  assert(task.actualStartTime !== null, "Task actualStartTime is set");
  assert(task.statusHistory.length === 2, "StatusHistory has 2 entries (Pending closed, In Progress opened)");
  assert(task.statusHistory[1].status === "In Progress", "Latest statusHistory entry is 'In Progress'");
  assert(task.statusHistory[1].endTime === null, "In Progress entry is currently open (endTime is null)");

  // Test 2: Day 1 Work (2 hours 35 minutes = 9,300,000 ms) and Move to On Hold at 12:35 PM
  console.log("\n--- TEST 2: DAY 1 Work (2h 35m) -> Move to On Hold ---");
  const day1HoldTime = new Date("2026-08-19T12:35:00+05:30");
  Date.now = () => day1HoldTime.getTime();

  handleItemStatusTransition(task, "In Progress", "On Hold", userId, officeSettings);

  const expectedWorkedMs = 2 * 3600 * 1000 + 35 * 60 * 1000; // 9,300,000 ms
  assert(task.status === "On Hold", "Task status is 'On Hold'");
  assert(task.totalTrackedTime === expectedWorkedMs, `totalTrackedTime is accrued correctly (${task.totalTrackedTime} ms == 2h 35m)`);
  assert(task.dailyTrackedTime === expectedWorkedMs, `dailyTrackedTime is accrued correctly (${task.dailyTrackedTime} ms)`);
  assert(task.holdStartedAt !== null, "holdStartedAt is recorded");
  assert(task.statusHistory.length === 3, "StatusHistory has 3 entries");
  
  const inProgressEntry = task.statusHistory.find(h => h.status === "In Progress" && h.endTime !== null);
  assert(inProgressEntry !== undefined, "In Progress history entry is properly closed with endTime");
  assert(inProgressEntry.duration === expectedWorkedMs, `In Progress duration is exactly 2h 35m (${inProgressEntry.duration} ms)`);

  const holdEntry = task.statusHistory[task.statusHistory.length - 1];
  assert(holdEntry.status === "On Hold", "Latest history entry is 'On Hold'");
  assert(holdEntry.endTime === null, "On Hold history entry is open");

  // Test 3: Day 2 Login -> Designer continues task (On Hold -> Pending) at 09:30 AM next day
  console.log("\n--- TEST 3: DAY 2 Designer Continues Task (On Hold -> Pending) ---");
  const day2ResumeTime = new Date("2026-08-20T09:30:00+05:30");
  Date.now = () => day2ResumeTime.getTime();

  handleItemStatusTransition(task, "On Hold", "Pending", userId, officeSettings);

  assert(task.status === "Pending", "Task status updated to 'Pending'");
  assert(task.actualStartTime === null, "actualStartTime is NULL so today's timer starts fresh at 00:00:00");
  assert(task.totalTrackedTime === expectedWorkedMs, `Lifetime totalTrackedTime is preserved across days (${task.totalTrackedTime} ms == 2h 35m)`);
  assert(task.holdEndedAt !== null, "holdEndedAt timestamp is recorded");

  // Verify business hours on-hold duration was calculated:
  // Aug 19 12:35 PM to 7:00 PM = 6h 25m (23,100,000 ms)
  // Aug 20 9:00 AM to 9:30 AM = 30m (1,800,000 ms)
  // Overnight 7:00 PM to 9:00 AM excluded!
  // Total on hold business duration = 6h 55m (24,900,000 ms)
  const closedHoldEntry = task.statusHistory.find(h => h.status === "On Hold" && h.endTime !== null);
  assert(closedHoldEntry !== undefined, "On Hold entry is closed with endTime");
  const expectedHoldBusinessMs = (6 * 3600 + 55 * 60) * 1000;
  assert(closedHoldEntry.duration === expectedHoldBusinessMs, `On Hold business duration correctly excludes overnight hours (${closedHoldEntry.duration} ms == 6h 55m)`);

  // Test 4: Day 2 Work (Pending -> In Progress) and work for 1 hour
  console.log("\n--- TEST 4: DAY 2 Work (Pending -> In Progress for 1 hour) ---");
  const day2StartTime = new Date("2026-08-20T10:00:00+05:30");
  Date.now = () => day2StartTime.getTime();

  handleItemStatusTransition(task, "Pending", "In Progress", userId, officeSettings);

  assert(task.status === "In Progress", "Task status is 'In Progress'");
  assert(new Date(task.actualStartTime).getTime() === day2StartTime.getTime(), "actualStartTime starts fresh at Day 2 start time");
  assert(task.totalTrackedTime === expectedWorkedMs, "totalTrackedTime remains 2h 35m at session start");

  // Simulate 1 hour of work on Day 2 -> Move to In Review at 11:00 AM
  const day2ReviewTime = new Date("2026-08-20T11:00:00+05:30");
  Date.now = () => day2ReviewTime.getTime();

  handleItemStatusTransition(task, "In Progress", "In Review", userId, officeSettings);

  const day2WorkedMs = 1 * 3600 * 1000; // 3,600,000 ms
  const totalLifetimeExpected = expectedWorkedMs + day2WorkedMs; // 3h 35m (12,900,000 ms)
  assert(task.status === "In Review", "Task status is 'In Review'");
  assert(task.totalTrackedTime === totalLifetimeExpected, `Lifetime totalTrackedTime is now 3h 35m (${task.totalTrackedTime} ms)`);
  assert(task.dailyTrackedTime === day2WorkedMs, `Day 2 dailyTrackedTime is 1h 00m (${task.dailyTrackedTime} ms)`);

  // Restore Date.now
  Date.now = origNow;

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
