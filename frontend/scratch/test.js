import { calculateBusinessMsBetween, formatHMS } from "../src/utils/taskTimerUtils.js";

const officeHours = { startHour: 9, endHour: 19, workingDays: [1, 2, 3, 4, 5, 6] };

const start = new Date("2026-08-27T18:00:00.000+05:30").getTime(); // 6:00 PM IST
const end = new Date("2026-08-27T20:00:00.000+05:30").getTime(); // 8:00 PM IST

const ms = calculateBusinessMsBetween(start, end, officeHours);
console.log(`Worked MS: ${ms} (${formatHMS(ms)})`); // Should be 1 hour (3600000)

const end2 = new Date("2026-08-27T19:30:00.000+05:30").getTime(); // 7:30 PM IST
const ms2 = calculateBusinessMsBetween(start, end2, officeHours);
console.log(`Worked MS 2: ${ms2} (${formatHMS(ms2)})`); // Should be 1 hour (3600000)

