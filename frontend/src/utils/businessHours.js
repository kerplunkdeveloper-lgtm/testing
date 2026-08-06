/**
 * Calculates the elapsed business office hours (in milliseconds) between two dates.
 * Excludes weekends (Saturday, Sunday) and non-working hours.
 * 
 * @param {Date|String|Number} startDate 
 * @param {Date|String|Number} endDate 
 * @param {Number} startHour - The hour the workday starts (0-23), defaults to 9
 * @param {Number} endHour - The hour the workday ends (0-23), defaults to 19
 * @param {Array} holidays - Array of holiday date strings (YYYY-MM-DD) for future support
 * @returns {Number} Total business milliseconds
 */
export function calculateBusinessMs(startDate, endDate, startHour = 9, endHour = 19, holidays = []) {
  if (!startDate || !endDate) return 0;

  let start = new Date(startDate);
  let end = new Date(endDate);

  if (start > end) return 0;

  let totalMs = 0;
  let current = new Date(start);

  while (current < end) {
    const day = current.getDay();
     
    // If Sunday, skip to next Monday startHour AM
    if (day === 0) { // 0 = Sunday
      current.setDate(current.getDate() + 1);
      current.setHours(startHour, 0, 0, 0);
      continue;
    }
    
    // Future expansion: skip holidays here if matching `holidays` array

    const currentHour = current.getHours();

    // If before office hours, skip forward to startHour AM today
    if (currentHour < startHour) {
      current.setHours(startHour, 0, 0, 0);
      continue;
    }

    // If after or exactly at office end, skip to startHour AM tomorrow
    if (currentHour >= endHour) {
      current.setDate(current.getDate() + 1);
      current.setHours(startHour, 0, 0, 0);
      continue;
    }

    // Calculate end of the current working block
    // It's either the exact end time OR the end of the current office day
    let endOfBlock = new Date(current);
    endOfBlock.setHours(endHour, 0, 0, 0);
    
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
