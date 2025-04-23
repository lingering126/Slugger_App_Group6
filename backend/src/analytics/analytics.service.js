const mongoose = require('mongoose');
const Group = require('../../models/group');
const ActivityLog = require('../models/activity-log');
const GroupCycleHistory = require('../models/group-cycle-history');
const User = require('../models/user');

// Helper function to generate the map key consistently based on the start of the interval
function generateTimeLabelKey(date, unit, timezone) {
  try {
    const options = { timeZone: timezone };
    let year, month, day, hour;

    // Use Intl.DateTimeFormat for more robust timezone handling
    const formatterYear = new Intl.DateTimeFormat('en-CA', { ...options, year: 'numeric' });
    year = formatterYear.format(date);

    const formatterMonth = new Intl.DateTimeFormat('en-CA', { ...options, month: '2-digit' });
    month = formatterMonth.format(date);
    if (unit === 'month') return `${year}-${month}`;

    const formatterDay = new Intl.DateTimeFormat('en-CA', { ...options, day: '2-digit' });
    day = formatterDay.format(date);
    if (unit === 'day') return `${year}-${month}-${day}`;

    // Use en-GB locale which typically gives 24-hour format
    const formatterHour = new Intl.DateTimeFormat('en-GB', { ...options, hour: '2-digit', hourCycle: 'h23' });
    // Extract the hour part (might need adjustment depending on exact output)
    const parts = formatterHour.formatToParts(date);
    const hourPart = parts.find(p => p.type === 'hour');
    hour = hourPart ? hourPart.value.padStart(2, '0') : '00'; // Default to 00 if not found
     // Handle potential midnight case where hour might be '24' in some locales, map to '00'
    if (hour === '24') hour = '00';

    if (unit === 'hour') return `${year}-${month}-${day}-${hour}`;

  } catch (error) {
      console.error(`Error formatting date key for ${date} with unit ${unit}:`, error);
      // Fallback or re-throw
      const iso = date.toISOString();
       if (unit === 'month') return iso.substring(0, 7);
       if (unit === 'day') return iso.substring(0, 10);
       if (unit === 'hour') return iso.substring(0, 13).replace('T', '-');
  }

  return ''; // Should not happen with valid units
}

class AnalyticsService {

  // Helper to find group by the 6-digit groupId string
  async findGroupByStringId(groupIdString) {
    const group = await Group.findOne({ groupId: groupIdString });
    if (!group) {
      throw new Error(`Group with ID ${groupIdString} not found`);
    }
    return group;
  }

  async isUserGroupMember(userId, groupIdString) {
    // Find group using the string ID first
    const group = await this.findGroupByStringId(groupIdString);
    // Use the group's actual _id (ObjectId) for membership check
    if (!group) { // Should be caught by findGroupByStringId, but double-check
      throw new Error('Group not found');
    }
    // Mongoose ObjectId comparison needs .equals()
    // Ensure userId is also an ObjectId if it's passed as a string
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    return group.members.some(memberId => memberId.equals(userObjectId));
  }

  /**
   * Fetches group overview summary stats (target, total, percentages).
   * Handles automatic cycle archiving and advancement if the current cycle has ended.
   */
  async getGroupOverviewSummary(groupIdString) {
    // Use the helper to find the group by string ID
    let group = await this.findGroupByStringId(groupIdString);
    const groupObjectId = group._id;
    const now = new Date();

    // Check if cycle needs to be archived and advanced
    if (now > group.targetEndDate) {
      console.log(`Cycle ended for group ${groupIdString}. Archiving and creating new cycle.`);
      
      // Calculate completion percentage *before* archiving
      const finalPercentage = await this.calculateTargetPercentage(groupObjectId, group.targetEndDate); // Calculate at the exact end time

      // 1. Archive the previous cycle
      const oldEndDate = new Date(group.targetEndDate); // Capture old end date before modifying
      const historyEntry = new GroupCycleHistory({
        groupId: groupObjectId,
        startDate: group.targetStartDate,
        endDate: oldEndDate,
        targetValue: group.targetValue,
        completionPercentage: finalPercentage, // Save the calculated percentage
      });
      await historyEntry.save();
      console.log(`Archived cycle: ${group.targetStartDate.toISOString()} - ${oldEndDate.toISOString()} with ${finalPercentage}% completion.`);

      // 2. Calculate new cycle start and end dates (immediately after the previous cycle)
      const newStartDate = new Date(oldEndDate);
      newStartDate.setMilliseconds(newStartDate.getMilliseconds() + 1); // Start immediately after

      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newStartDate.getDate() + 7);
      newEndDate.setMilliseconds(newEndDate.getMilliseconds() - 1); // End exactly 7 days after new start
      
      console.log(`New cycle dates: ${newStartDate.toISOString()} - ${newEndDate.toISOString()}`);

      // Update Group document
      group.targetStartDate = newStartDate;
      group.targetEndDate = newEndDate;
      // targetValue remains unchanged unless there's specific logic
      // Mongoose pre-save hook for targetValue will run if targetMental/PhysicalValue are involved
      try {
        await group.save(); // Save the updated group
        console.log(`Group ${groupIdString} updated with new cycle.`);
        // Re-fetch the group to ensure we use the updated dates for calculations
        group = await this.findGroupByStringId(groupIdString);
        if (!group) {
            throw new Error(`Group ${groupIdString} not found after cycle update.`);
        }
      } catch (saveError) {
        console.error(`Error saving group ${groupIdString} after cycle update:`, saveError);
        // Decide how to handle this error - maybe throw, maybe proceed with old data?
        // For now, let's re-throw to make the API call fail clearly.
        throw new Error(`Failed to update group cycle: ${saveError.message}`);
      }
    } // end if cycle ended

    // Fetch logs for the *current* cycle
    const logs = await ActivityLog.find({
      groupId: groupObjectId, // Use ObjectId here
      timestamp: { $gte: group.targetStartDate, $lte: group.targetEndDate },
    }).lean(); // Use lean() for better performance

    // Calculate summary stats
    const currentTotal = logs.reduce((sum, log) => sum + log.points, 0);
    const percentOfTarget = group.targetValue > 0 ? (currentTotal / group.targetValue) * 100 : 0;
    const cycleDuration = group.targetEndDate.getTime() - group.targetStartDate.getTime();
    const timeElapsed = now.getTime() - group.targetStartDate.getTime();
    const percentOfTimeGone = cycleDuration > 0 ? Math.min(1, timeElapsed / cycleDuration) * 100 : 0;

    return {
      groupTarget: group.targetValue,
      currentTotal,
      percentOfTarget,
      percentOfTimeGone,
    };
  }

  /**
   * Fetches the progress of each member within the current cycle.
   * Does NOT handle cycle archiving/advancement.
   */
  async getMemberProgress(groupIdString) {
     // Find the group but DON'T modify cycle dates here
    let group = await this.findGroupByStringId(groupIdString);
    const groupObjectId = group._id;

    // Populate members with necessary info
    group = await group.populate('members', 'name avatar');
    if (!group) { // Should be caught by findGroupByStringId, but check again
        throw new Error(`Group ${groupIdString} not found when fetching member progress.`);
    }

    // Fetch logs ONLY for the current cycle dates stored in the group doc
    const logs = await ActivityLog.find({
      groupId: groupObjectId,
      timestamp: { $gte: group.targetStartDate, $lte: group.targetEndDate },
    }).lean();

    // Calculate each member's score for this cycle
    const membersProgressMap = new Map();
    group.members.forEach(member => {
      // Ensure member is a valid object before accessing properties
      if (member && member._id) { 
          membersProgressMap.set(member._id.toString(), {
            userId: member._id.toString(),
            name: member.name || 'Unknown User',
            avatar: member.avatar || '',
            completed: 0
          });
      } else {
          console.warn(`Invalid member data encountered in group ${groupIdString}:`, member);
      }
    });

    logs.forEach(log => {
      // Ensure log.userId is valid before converting
      if (log.userId) { 
          const userIdStr = log.userId.toString();
          if (membersProgressMap.has(userIdStr)) {
            membersProgressMap.get(userIdStr).completed += log.points;
          }
      } else {
          console.warn(`ActivityLog found with missing userId in group ${groupIdString}:`, log._id);
      }
    });

    // Return just the membersProgress array
    return {
        membersProgress: Array.from(membersProgressMap.values()) 
    };
  }

  /**
   * Calculates the start date and time unit based on the range.
   * @param {string} range - '1Y', '1M', '1W', '24H'
   * @returns {{startDate: Date, unit: 'month'|'day'|'hour', count: number, sampleUnit?: 'day', sampleInterval?: number}}
   */
  _getRangeDetails(range) {
    const now = new Date();
    let startDate = new Date(now);
    let unit;
    let count;
    let sampleUnit = undefined;
    let sampleInterval = undefined;

    switch (range) {
      case '1Y':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 11);
        startDate.setDate(1); // Start from the 1st of the month, 12 months ago
        unit = 'month';
        count = 12; // Exactly 12 months
        console.log("now:", new Date(now), "startDate:", new Date(startDate))
        break;
      case '1M':
        // Go back 28 days to get 7 samples of 4 days each
        startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        unit = 'day'; // Underlying unit is day
        count = 7; // 7 sample points
        sampleUnit = 'day';
        sampleInterval = 4; // Sample every 4 days
        console.log("now:", new Date(now), "startDate:", new Date(startDate))
        break;
      case '24H':
        startDate.setHours(now.getHours() - 24);
        unit = 'hour';
        count = 25; // 24 intervals + now
        console.log("now:", new Date(now), "startDate:", new Date(startDate))
        break;
      case '1W':
        // Go back 6 full days from now to make 7 days total
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // 6 days ago, same time
        unit = 'day'; // Unit is now day
        count = 7; // Exactly 7 days
        console.log("now:", new Date(now), "startDate:", new Date(startDate))
        break;
      default:
        // Default to 1W if range is invalid? Or throw error?
        console.warn(`Invalid time range specified: ${range}. Defaulting to '1W'.`);
        range = '1W'; // Update range variable
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        unit = 'day';
        count = 7;
        // throw new Error('Invalid time range specified.');
    }
    // Ensure the returned range reflects any default override
    return { startDate, unit, count, sampleUnit, sampleInterval, range };
  }

  /**
   * Generates labels and timestamps for the chart based on range details.
   * @param {Date} startDate
   * @param {'month'|'day'|'hour'} unit
   * @param {number} count
   * @param {string} range - '1Y', '1M', '1W', '24H'
   * @param {'day'} [sampleUnit] - For '1M' range
   * @param {number} [sampleInterval] - For '1M' range (e.g., 4)
   * @returns {{labels: string[], fullLabels: string[], isoTimestamps: string[]}}
   */
  _generateLabels(startDate, unit, count, range, sampleUnit, sampleInterval) {
    const labels = [];
    const fullLabels = [];
    const isoTimestamps = []; // Timestamps for data fetching points
    const now = new Date(); // Use the current time as the anchor for relative ranges

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // For '1W' labels

    if (range === '1Y') {
      // 1Y logic is based on historical month ends, uses startDate correctly
      const current = new Date(startDate); // Start from the calculated beginning of the 12-month window
      for (let i = 0; i < count; i++) {
        const monthIndex = current.getMonth();
        labels.push(months[monthIndex]);
        fullLabels.push(fullMonths[monthIndex]);
        // Timestamp for '1Y' should represent the *end* of the month for cycle history lookup
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
        isoTimestamps.push(monthEnd.toISOString());
        current.setMonth(current.getMonth() + 1);
      }
    } else if (range === '1M') {
       if (!sampleUnit || !sampleInterval) throw new Error("Sample unit and interval needed for 1M range");
       // Generate 7 points, relative to 'now', stepping back by sampleInterval days
       for (let i = count - 1; i >= 0; i--) {
           // Calculate the timestamp by subtracting days from 'now'
           const timestamp = new Date(now.getTime() - i * sampleInterval * 24 * 60 * 60 * 1000);
           // Use this exact timestamp for calculation
           isoTimestamps.push(timestamp.toISOString());

           // Generate labels based on this timestamp
           labels.push(`${months[timestamp.getMonth()]} ${timestamp.getDate()}`); // e.g., "Apr 23"
           fullLabels.push(`${fullMonths[timestamp.getMonth()]} ${timestamp.getDate()}, ${timestamp.getFullYear()}`); // "April 23, 2025"
       }
    } else if (range === '1W') {
       // Generate 7 points, relative to 'now', stepping back by 1 day
       for (let i = count - 1; i >= 0; i--) {
           // Calculate timestamp by subtracting days from 'now'
           const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
           // Use this exact timestamp
           isoTimestamps.push(timestamp.toISOString());

           // Generate labels based on this timestamp
           labels.push(days[timestamp.getDay()]); // "Sun", "Mon", etc.
           fullLabels.push(`${days[timestamp.getDay()]}, ${months[timestamp.getMonth()]} ${timestamp.getDate()}`); // "Wed, Apr 23"
       }
    } else { // '24H'
       // Generate 25 points, relative to 'now', stepping back by 1 hour
       for (let i = count - 1; i >= 0; i--) {
           // Calculate timestamp by subtracting hours from 'now'
           const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
           // Use this exact timestamp
           isoTimestamps.push(timestamp.toISOString());

           // Generate labels based on how many hours ago (i)
           if (i === 0) {
               labels.push('Now');
               fullLabels.push('Now');
           } else {
               const hoursAgo = i;
               labels.push(`${hoursAgo}h`);
               fullLabels.push(`${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`);
           }
       }
    }

    // The loops iterating from count-1 down to 0 already produce chronological order [oldest -> newest]
    return { labels, fullLabels, isoTimestamps };
  }

  async getTimeline(groupIdString, range) {
    // Find group by string ID first to get the ObjectId
    const groupDoc = await this.findGroupByStringId(groupIdString);
    if (!groupDoc) {
        // It might be better to let findGroupByStringId throw, but double check
        console.error(`Group not found via string ID: ${groupIdString} in getTimeline`);
        throw new Error(`Group not found`);
    }
    const groupObjectId = groupDoc._id; // Use the actual ObjectId

    // 1. Get range details and generate labels/timestamps
    // _getRangeDetails now returns the validated/defaulted range as well
    const rangeDetails = this._getRangeDetails(range);
    // Pass all details needed by _generateLabels
    const { labels, fullLabels, isoTimestamps } = this._generateLabels(
        rangeDetails.startDate,
        rangeDetails.unit,
        rangeDetails.count,
        rangeDetails.range, // Use the potentially updated range
        rangeDetails.sampleUnit,
        rangeDetails.sampleInterval
    );

    let data = [];
    let meta = undefined; // For 1Y specific data

    // 2. Call specific calculation logic based on range
    switch (rangeDetails.range) {
      case '1Y':
        const yearlyResult = await this._calculateYearlyData(groupObjectId, isoTimestamps);
        data = yearlyResult.averages;
        meta = {
            completedCycles: yearlyResult.completedCycles,
            totalCycles: yearlyResult.totalCycles,
        };
        break;
      case '1M':
        // Pass necessary details to the monthly calculation function
        data = await this._calculateMonthlyTrendData(groupObjectId, rangeDetails.startDate, rangeDetails.sampleInterval, rangeDetails.count);
        break;
      case '1W':
      case '24H':
        // Use Promise.all for concurrency with the standard calculateTargetPercentage
        const percentagePromises = isoTimestamps.map(timestampStr => {
          const timestamp = new Date(timestampStr);
          // Call calculateTargetPercentage *without* includeCycleInfo for these ranges
          return this.calculateTargetPercentage(groupObjectId, timestamp, false);
        });
        data = await Promise.all(percentagePromises);
        break;
      default:
         // This case should ideally not be reached due to default in _getRangeDetails
         console.error(`Unhandled range in getTimeline: ${rangeDetails.range}`);
         throw new Error(`Internal error: Unhandled time range ${rangeDetails.range}`);
    }

    // 3. Return the results
    return {
      labels,
      fullLabels,
      isoTimestamps, // Might be useful for frontend debugging or tooltips
      data,
      // cycleIndices is no longer relevant or easily calculated here
      meta, // Include meta for '1Y'
    };
  }

  /**
   * Calculates the yearly timeline data (monthly averages based on cycle end percentages).
   * Includes active cycle if relevant for the current month.
   * @private
   * @param {mongoose.Types.ObjectId} groupId - The ObjectId of the group.
   * @param {string[]} monthEndTimestamps - ISO strings representing the end of each month in the range.
   * @returns {Promise<{averages: number[], completedCycles: number[], totalCycles: number[]}>}
   */
  async _calculateYearlyData(groupId, monthEndTimestamps) {
    const averages = new Array(monthEndTimestamps.length).fill(0);
    const completedCycles = new Array(monthEndTimestamps.length).fill(0);
    const totalCycles = new Array(monthEndTimestamps.length).fill(0);
    const now = new Date(); // Get current time

    // Determine the overall window start date (approx 1 year before the first monthEndTimestamp)
    const overallStartDate = new Date(monthEndTimestamps[0]);
    overallStartDate.setFullYear(overallStartDate.getFullYear() - 1);
    overallStartDate.setDate(1); // Start from beginning of the month for safety

    // Find all cycle histories for the group that ended within this rough yearly window
    const relevantCycles = await GroupCycleHistory.find({
      groupId: groupId,
      endDate: { $gte: overallStartDate, $lte: new Date(monthEndTimestamps[monthEndTimestamps.length - 1]) } // Optimization: only cycles ending within the exact range
    }).lean(); // Use lean for performance

    // Process each month
    for (let i = 0; i < monthEndTimestamps.length; i++) {
      const monthEndDate = new Date(monthEndTimestamps[i]);
      const monthStartDate = new Date(monthEndDate.getFullYear(), monthEndDate.getMonth(), 1, 0, 0, 0, 0); // Start of the month

      let sumPercentage = 0;
      let countCyclesInMonth = 0;
      let countCompletedInMonth = 0;

      // Filter historical cycles ending this month
      const cyclesEndingThisMonth = relevantCycles.filter(cycle =>
        cycle.endDate >= monthStartDate && cycle.endDate <= monthEndDate
      );

      for (const cycle of cyclesEndingThisMonth) {
        // Use the saved completionPercentage if available and valid, otherwise treat as 0
        const percentage = (cycle.completionPercentage !== undefined && cycle.completionPercentage !== null && cycle.completionPercentage >= 0)
                           ? cycle.completionPercentage
                           : 0;
        sumPercentage += percentage;
        countCyclesInMonth++;
        if (percentage >= 100) {
          countCompletedInMonth++;
        }
      }

      // --- Enhancement for Active Cycle ---
      // Check if this is the last month in the array AND it corresponds to the current calendar month
      const isLastMonth = i === monthEndTimestamps.length - 1;
      const isCurrentMonth = now >= monthStartDate && now <= monthEndDate;

      if (isLastMonth && isCurrentMonth) {
          // Check if there's an active cycle *now*
          const activeCycleResult = await this.calculateTargetPercentage(groupId, now, true); // Get percentage and cycle info

          // Check if the timestamp 'now' actually falls within an active cycle
          if (activeCycleResult && activeCycleResult.cycle && activeCycleResult.cycle.__isActiveCycle) {
              // Check if this active cycle *started* before the end of the current month's calculation point
              // This avoids including a cycle that just started moments ago if monthEndDate was slightly in the past.
              // Also ensures we don't double count if the active cycle somehow got archived *after* the history fetch but before this check.
              const activeCycleStartDate = activeCycleResult.cycle.startDate;
              if (activeCycleStartDate <= monthEndDate) {
                  // Avoid double-counting if this exact active cycle was *also* in cyclesEndingThisMonth (highly unlikely but possible if manual reset happened exactly at month end)
                  const alreadyCounted = cyclesEndingThisMonth.some(c => c.startDate.getTime() === activeCycleStartDate.getTime());

                  if (!alreadyCounted) {
                      const activePercentage = activeCycleResult.percentage;
                      sumPercentage += activePercentage;
                      countCyclesInMonth++; // Increment count as we're including the active cycle
                      if (activePercentage >= 100) {
                          countCompletedInMonth++;
                      }
                  }
              }
          }
      }
      // --- End Enhancement ---

      totalCycles[i] = countCyclesInMonth;
      completedCycles[i] = countCompletedInMonth;
      // Calculate average, handle division by zero
      averages[i] = countCyclesInMonth > 0 ? Math.round(sumPercentage / countCyclesInMonth) : 0;
    }

    return { averages, completedCycles, totalCycles };
  }

  /**
   * Calculates the monthly trend data (average of 4 points per sample, based on dominant cycle).
   * @private
   * @param {mongoose.Types.ObjectId} groupId - The ObjectId of the group.
   * @param {Date} overallStartDate - The start date of the 28-day window.
   * @param {number} sampleIntervalDays - The interval between samples (e.g., 4).
   * @param {number} sampleCount - The number of samples (e.g., 7).
   * @returns {Promise<number[]>} - Array of trend data percentages.
   */
  async _calculateMonthlyTrendData(groupId, overallStartDate, sampleIntervalDays, sampleCount) {
      const trendData = new Array(sampleCount).fill(0);

      // Generate the end timestamp for each sample period first
      const sampleEndDates = Array.from({ length: sampleCount }, (_, i) => {
        const endDate = new Date(overallStartDate);
        endDate.setDate(overallStartDate.getDate() + (i + 1) * sampleIntervalDays);
        endDate.setHours(23, 59, 59, 999); // End of the day
        return endDate;
      });

      // Process each sample period
      const trendPromises = sampleEndDates.map(async (sampleEndDate) => {
          const timestampsToAverage = [];
          // Generate 4 timestamps: end of day for the last 4 days ending on sampleEndDate
          for (let j = 0; j < 4; j++) {
              const pointDate = new Date(sampleEndDate);
              pointDate.setDate(sampleEndDate.getDate() - j);
              pointDate.setHours(23, 59, 59, 999); // End of day
              timestampsToAverage.push(pointDate);
          }
          timestampsToAverage.reverse(); // Process chronologically [day-3, day-2, day-1, day-0]

          // Fetch percentages and cycle info concurrently for the 4 points
          const pointResults = await Promise.all(
              timestampsToAverage.map(ts => this.calculateTargetPercentage(groupId, ts, true)) // Request cycle info
          );

          // Analyze results to determine dominant cycle
          const cycleCounts = {}; // Map: cycleIdString -> count
          let lastCycleIdString = null;

          pointResults.forEach(result => {
              if (result.cycle) {
                  // Generate a consistent ID string: ObjectId or 'active-[startDateISO]'
                  const cycleIdString = result.cycle._id
                        ? result.cycle._id.toString()
                        : `active-${result.cycle.startDate.toISOString()}`;
                  cycleCounts[cycleIdString] = (cycleCounts[cycleIdString] || 0) + 1;
                  lastCycleIdString = cycleIdString; // Track the last seen cycle ID
              }
          });

          // Find the dominant cycle ID
          let dominantCycleIdString = null;
          let maxCount = 0;
          for (const cycleIdString in cycleCounts) {
              if (cycleCounts[cycleIdString] > maxCount) {
                  maxCount = cycleCounts[cycleIdString];
                  dominantCycleIdString = cycleIdString;
              }
          }

          // Handle ties: prefer the last cycle if counts are equal and > 0
          if (maxCount > 0) {
              const tiedCycles = Object.keys(cycleCounts).filter(id => cycleCounts[id] === maxCount);
              if (tiedCycles.length > 1 && tiedCycles.includes(lastCycleIdString)) {
                  dominantCycleIdString = lastCycleIdString;
              } else if (tiedCycles.length === 1) {
                   dominantCycleIdString = tiedCycles[0]; // No tie, or last wasn't involved/max
              } else if (tiedCycles.length === 0) {
                  // Should not happen if maxCount > 0
                  dominantCycleIdString = null;
              }
              // If still tied after considering lastCycleIdString, the first one encountered with maxCount remains dominant.
          }


          // Sum percentages only from the dominant cycle
          let totalPercentageInDominantCycle = 0;
          let pointsInDominantCycle = 0;
          pointResults.forEach(result => {
             if (result.cycle) {
                 const currentCycleIdString = result.cycle._id
                        ? result.cycle._id.toString()
                        : `active-${result.cycle.startDate.toISOString()}`;
                 if (currentCycleIdString === dominantCycleIdString && dominantCycleIdString !== null) {
                     totalPercentageInDominantCycle += result.percentage;
                     pointsInDominantCycle++;
                 }
             }
          });

          // Calculate average for the dominant cycle
          return pointsInDominantCycle > 0
              ? Math.round(totalPercentageInDominantCycle / pointsInDominantCycle)
              : 0; // Default to 0 if no points in the dominant cycle
      });

      // Resolve all sample period calculations
      return Promise.all(trendPromises);
  }

  /**
   * Calculates the percentage of the target completed for a specific group
   * at a given timestamp within its corresponding cycle.
   * Can optionally return the cycle details.
   * @param {mongoose.Types.ObjectId} groupId - The ObjectId of the group.
   * @param {Date} timestamp - The specific point in time to calculate the percentage for.
   * @param {boolean} [includeCycleInfo=false] - Whether to return cycle info along with percentage.
   * @returns {Promise<number | {percentage: number, cycle: object|null}>} - The calculated percentage (0-100) or an object containing percentage and cycle info.
   */
  async calculateTargetPercentage(groupId, timestamp, includeCycleInfo = false) {
    let cycleStartDate;
    let cycleTargetValue;
    let foundCycle = null; // To store the found cycle document

    // 1. Check GroupCycleHistory first
    const historyCycle = await GroupCycleHistory.findOne({
      groupId: groupId,
      startDate: { $lte: timestamp },
      endDate: { $gte: timestamp },
    }).lean();

    if (historyCycle) {
      cycleStartDate = historyCycle.startDate;
      cycleTargetValue = historyCycle.targetValue;
      foundCycle = historyCycle;
    } else {
      // 2. If not in history, check the current active cycle in Group
      // Fetch the group by ObjectId directly
      const group = await Group.findById(groupId).lean(); // Use lean
      // Ensure group is found and timestamp is within its active cycle dates
      if (group && group.targetStartDate && group.targetEndDate &&
          group.targetStartDate <= timestamp && timestamp <= group.targetEndDate)
      {
        cycleStartDate = group.targetStartDate;
        cycleTargetValue = group.targetValue;
        // Construct a cycle-like object for consistency if needed later
        foundCycle = {
          _id: null, // Indicate it's the active cycle from Group doc
          groupId: group._id,
          startDate: group.targetStartDate,
          endDate: group.targetEndDate,
          targetValue: group.targetValue,
          __isActiveCycle: true // Custom flag
        };
      } else {
        // Timestamp doesn't fall into any known cycle for this group OR group not found
        // console.warn(`Timestamp ${timestamp.toISOString()} does not fall into any known cycle for group ${groupId} or group not found. Returning 0.`);
        // If no cycle matches the timestamp, the progress for that point is 0 relative to any cycle.
        return includeCycleInfo ? { percentage: 0, cycle: null } : 0;
      }
    }

    // Ensure targetValue is valid for calculation
    if (!cycleTargetValue || cycleTargetValue <= 0) {
      // If target is 0 or less, or undefined/null return 0.
      return includeCycleInfo ? { percentage: 0, cycle: foundCycle } : 0; // Return cycle info even if percentage is 0
    }

    // 3. Fetch ActivityLog records from cycle start up to the given timestamp
    const logs = await ActivityLog.find({
      groupId: groupId,
      timestamp: { $gte: cycleStartDate, $lte: timestamp },
    }).lean();

    // 4. Calculate total points
    const totalPoints = logs.reduce((sum, log) => sum + log.points, 0);

    // 5. Calculate percentage
    const percentage = Math.round((totalPoints / cycleTargetValue) * 100);

    // Clamp the result between 0 and 100
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    return includeCycleInfo
      ? { percentage: clampedPercentage, cycle: foundCycle }
      : clampedPercentage;
  }
}

module.exports = AnalyticsService; 