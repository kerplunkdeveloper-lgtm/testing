const OFFICE_START_HOUR = 9;
const OFFICE_END_HOUR = 19; // 7 PM

/**
 * Calculates the elapsed business office hours (in milliseconds) between two dates.
 * Excludes weekends (Saturday, Sunday) and non-working hours (7 PM to 9 AM).
 * 
 * @param {Date|String|Number} startDate 
 * @param {Date|String|Number} endDate 
 * @param {Array} holidays - Array of holiday date strings (YYYY-MM-DD) for future support
 * @returns {Number} Total business milliseconds
 */
function calculateBusinessMs(startDate, endDate, holidays = []) {
  if (!startDate || !endDate) return 0;

  let start = new Date(startDate);
  let end = new Date(endDate);

  if (start > end) return 0;

  let totalMs = 0;
  let current = new Date(start);

  while (current < end) {
    const day = current.getDay();
    
    // If weekend, skip to next Monday 9 AM
    if (day === 0 || day === 6) { // 0 = Sunday, 6 = Saturday
      current.setDate(current.getDate() + (day === 0 ? 1 : 2));
      current.setHours(OFFICE_START_HOUR, 0, 0, 0);
      continue;
    }
    
    // Future expansion: skip holidays here if matching `holidays` array

    const currentHour = current.getHours();

    // If before office hours, skip forward to 9 AM today
    if (currentHour < OFFICE_START_HOUR) {
      current.setHours(OFFICE_START_HOUR, 0, 0, 0);
      continue;
    }

    // If after or exactly at office end, skip to 9 AM tomorrow
    if (currentHour >= OFFICE_END_HOUR) {
      current.setDate(current.getDate() + 1);
      current.setHours(OFFICE_START_HOUR, 0, 0, 0);
      continue;
    }

    // Calculate end of the current working block
    // It's either the exact end time OR the end of the current office day
    let endOfBlock = new Date(current);
    endOfBlock.setHours(OFFICE_END_HOUR, 0, 0, 0);
    
    if (end < endOfBlock) {
      endOfBlock = new Date(end);
    }

    // Add duration of this block
    totalMs += (endOfBlock.getTime() - current.getTime());
    
    // Move current time past this block
    current = new Date(endOfBlock);
  }

  return totalMs;
}

module.exports = { calculateBusinessMs };
