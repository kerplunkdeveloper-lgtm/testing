/**
 * Gets IST (Asia/Kolkata) day, hour, and minute for a date object.
 * IST is fixed at UTC+5:30 (offset +330 minutes) without Daylight Saving Time.
 */
export function getISTDateParts(date = new Date()) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return { day: 0, hour: 0, minute: 0 };
    }
    const istDate = new Date(d.getTime() + 330 * 60 * 1000);
    return {
      day: istDate.getUTCDay(),
      hour: istDate.getUTCHours(),
      minute: istDate.getUTCMinutes(),
    };
  } catch (e) {
    const d = new Date(date);
    return { day: d.getDay(), hour: d.getHours(), minute: d.getMinutes() };
  }
}

/**
 * Calculates the elapsed business office hours (in milliseconds) between two dates in Asia/Kolkata IST.
 * Excludes non-working days (default Sunday = 0) and non-working hours.
 */
export function calculateBusinessMs(startDate, endDate, startHour = 9, endHour = 19, workingDays = [1, 2, 3, 4, 5, 6], holidays = []) {
  if (!startDate || !endDate) return 0;
  let start = new Date(startDate).getTime();
  let end = new Date(endDate).getTime();
  if (isNaN(start) || isNaN(end) || start >= end) return 0;

  const IST_OFFSET = 330 * 60 * 1000;
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
      // Non-working day: skip forward to next day midnight IST
      const msToday = (hour * 3600 + min * 60 + sec) * 1000 + ms;
      curTime += (24 * 3600 * 1000 - msToday);
      continue;
    }

    if (hour < startHour) {
      // Before startHour: advance to startHour today IST
      const msUntilStart = ((startHour - hour) * 3600 - min * 60 - sec) * 1000 - ms;
      curTime += msUntilStart;
      continue;
    }

    if (hour >= endHour) {
      // After or at endHour: advance to next day midnight IST
      const msToday = (hour * 3600 + min * 60 + sec) * 1000 + ms;
      curTime += (24 * 3600 * 1000 - msToday);
      continue;
    }

    // Inside office working hours block today
    const curBlockEndIST = new Date(curIST);
    curBlockEndIST.setUTCHours(endHour, 0, 0, 0);
    const curBlockEndTime = curBlockEndIST.getTime() - IST_OFFSET;

    const blockEnd = Math.min(end, curBlockEndTime);
    totalMs += (blockEnd - curTime);
    curTime = blockEnd;
  }

  return totalMs;
}

