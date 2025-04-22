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
      
      // 1. Archive the previous cycle
      const oldEndDate = new Date(group.targetEndDate); // Capture old end date before modifying
      const historyEntry = new GroupCycleHistory({
        groupId: groupObjectId,
        startDate: group.targetStartDate,
        endDate: oldEndDate,
        targetValue: group.targetValue,
      });
      await historyEntry.save();
      console.log(`Archived cycle: ${group.targetStartDate.toISOString()} - ${oldEndDate.toISOString()}`);

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
   * @param {string} range - '6H', '12H', '24H', '1W', '1Y'
   * @returns {{startDate: Date, unit: 'hour'|'day'|'month', count: number}}
   */
  _getRangeDetails(range) {
    const now = new Date();
    let startDate = new Date(now);
    let unit;
    let count;

    switch (range) {
      case '6H':
        startDate.setHours(now.getHours() - 6);
        unit = 'hour';
        count = 7; // 6 intervals + now
        break;
      case '12H':
        startDate.setHours(now.getHours() - 12);
        unit = 'hour';
        count = 13; // 12 intervals + now
        break;
      case '24H':
        startDate.setHours(now.getHours() - 24);
        unit = 'hour';
        count = 25; // 24 intervals + now
        break;
      case '1W':
        startDate.setDate(now.getDate() - 7);
        unit = 'day';
        count = 8; // 7 intervals + today
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        unit = 'month';
        count = 13; // 12 intervals + this month
        break;
      default:
        throw new Error('Invalid time range specified.');
    }
    return { startDate, unit, count };
  }

  /**
   * Generates labels and timestamps for the chart based on range details.
   * @param {Date} startDate
   * @param {'hour'|'day'|'month'} unit
   * @param {number} count
   * @param {string} range - '6H', '12H', '24H', '1W', '1Y' (used for specific label formatting)
   * @returns {{labels: string[], fullLabels: string[], isoTimestamps: string[]}}
   */
  _generateLabels(startDate, unit, count, range) {
    const labels = [];
    const fullLabels = [];
    const isoTimestamps = [];
    const current = new Date(startDate);
    const now = new Date();

    // Helper to format hours based on frontend mock
    const formatHourLabel = (date, index, totalCount) => {
      const hoursAgo = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      if (index === totalCount - 1) return { short: 'Now', full: 'Now' }; // Last point is always Now
      if (range === '24H') {
        // For 24H, use numeric labels counting down, but skip some for brevity in mock
         // Let's generate all hour labels first, then decide which ones to show if needed based on frontend logic
         // For now, return all hourly relative labels
        return { short: `${hoursAgo}h`, full: `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago` };
        // TODO: If frontend strictly needs ["24", "22", ...], logic needs adjustment here
      } else {
        return { short: `${hoursAgo}h`, full: `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago` };
      }
    };

    // Helper for Day labels (matches frontend mock)
    const formatDayLabel = (date, index, totalCount) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayIndex = date.getDay();
       // Use absolute day names like frontend mock
      return { short: days[dayIndex], full: fullDays[dayIndex] };
    };

    // Helper for Month labels (matches frontend mock)
    const formatMonthLabel = (date, index, totalCount) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthIndex = date.getMonth();
       // Use absolute month names like frontend mock
      return { short: months[monthIndex], full: fullMonths[monthIndex] };
    };

    for (let i = 0; i < count; i++) {
      isoTimestamps.push(current.toISOString()); // Store ISO timestamp for the start of the interval
      let labelInfo;

      if (unit === 'hour') {
        labelInfo = formatHourLabel(current, i, count);
        current.setHours(current.getHours() + 1);
      } else if (unit === 'day') {
        labelInfo = formatDayLabel(current, i, count);
        current.setDate(current.getDate() + 1);
      } else { // month
        labelInfo = formatMonthLabel(current, i, count);
        current.setMonth(current.getMonth() + 1);
      }
      labels.push(labelInfo.short);
      fullLabels.push(labelInfo.full);
    }
    
    // Adjust 24H labels to match frontend's specific subset if needed (example shows numbers)
    if (range === '24H') {
      // Frontend mock shows: ["24", "22", "20", ..., "2"]
      // Our current labels are: ["24h", "23h", ..., "1h", "Now"]
      // Option 1: Keep detailed hourly labels from backend
      // Option 2: Try to replicate the frontend mock subset (more complex mapping)
      // Let's stick with Option 1 for now (more data) unless frontend strictly requires the subset.
      // labels[count - 1] = 'Now'; // Already handled by formatHourLabel
    }

    return { labels, fullLabels, isoTimestamps };
  }

  async getTimeline(groupIdString, range) {
    const group = await this.findGroupByStringId(groupIdString);
    const groupObjectId = group._id;
    const now = new Date();
    const timezone = "Australia/Perth"; // Use consistent timezone

    // 1. Determine overall time window and generate timeline structure
    const { startDate: windowStartDate, unit, count } = this._getRangeDetails(range);
    const { labels, fullLabels, isoTimestamps } = this._generateLabels(windowStartDate, unit, count, range);

    // 2. Find all relevant cycles (historical + potentially active)
    const historyCycles = await GroupCycleHistory.find({
      groupId: groupObjectId,
      // Cycle must end after the window starts OR start before the window ends
      $or: [
        { endDate: { $gte: windowStartDate } },
        { startDate: { $lte: now } }
      ]
    }).sort({ startDate: 1 }).lean();

    const allCycles = [...historyCycles];
    // Check if active cycle needs to be added (if not already implicitly ended and archived)
    const isActiveCycleRelevant = group.targetEndDate >= windowStartDate && group.targetStartDate <= now;
    const isAlreadyArchived = historyCycles.some(hc => 
        hc.startDate.getTime() === group.targetStartDate.getTime() && 
        hc.endDate.getTime() === group.targetEndDate.getTime()
    );

    if (isActiveCycleRelevant && !isAlreadyArchived) {
        // Find appropriate position to insert active cycle based on start date
        const insertIndex = allCycles.findIndex(c => c.startDate > group.targetStartDate);
        const activeCycleEntry = {
            _id: new mongoose.Types.ObjectId(), // Temporary ID for processing
            groupId: groupObjectId,
            startDate: group.targetStartDate,
            endDate: group.targetEndDate, 
            targetValue: group.targetValue,
            __isActiveCycle: true // Mark as active
        };
        if (insertIndex === -1) {
             allCycles.push(activeCycleEntry);
        } else {
             allCycles.splice(insertIndex, 0, activeCycleEntry);
        }
    }

    // Map to store aggregated results per cycle: Map<cycleIndex, Map<timeLabelKey, value>>
    const cycleAggregatedData = new Map(); 

    // 3. Aggregate points for each relevant cycle
    for (let cycleIndex = 0; cycleIndex < allCycles.length; cycleIndex++) {
      const cycle = allCycles[cycleIndex];
      const cycleStartDate = cycle.startDate;
      const cycleEndDate = cycle.endDate;

      // Determine the effective time range for this cycle within the overall window
      const matchStartDate = new Date(Math.max(windowStartDate.getTime(), cycleStartDate.getTime()));
      const matchEndDate = new Date(Math.min(now.getTime(), cycleEndDate.getTime()));
      
      // Skip cycle if its effective range is invalid or outside the window
      if (matchStartDate >= matchEndDate) {
          continue;
      }

      let dateGroupFormat;
      if (unit === 'hour') dateGroupFormat = { $dateToString: { format: "%Y-%m-%d-%H", date: "$timestamp", timezone } };
      else if (unit === 'day') dateGroupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone } };
      else dateGroupFormat = { $dateToString: { format: "%Y-%m", date: "$timestamp", timezone } };
      
      const aggregationPipeline = [
        {
          $match: {
            groupId: groupObjectId,
            timestamp: { $gte: matchStartDate, $lte: matchEndDate } // Match within cycle & window
          }
        },
        {
          $group: {
            _id: dateGroupFormat,
            totalPoints: { $sum: "$points" }
          }
        },
        {
          $project: {
            _id: 0,
            timeLabel: "$_id", // Format: YYYY-MM-DD-HH or YYYY-MM-DD or YYYY-MM
            value: "$totalPoints"
          }
        }
      ];

      const cycleResult = await ActivityLog.aggregate(aggregationPipeline);
      
      // Store results in a map for easy lookup for this specific cycle
      const cycleDataMap = new Map(cycleResult.map(item => [item.timeLabel, item.value]));
      cycleAggregatedData.set(cycleIndex, cycleDataMap);
    }

    // 4. Map aggregated data to the final timeline structure (with cumulative logic)
    const finalData = new Array(count).fill(0);
    const finalCycleIndices = new Array(count).fill(null);

    // Yearly range: use max percentage in that month
    if (range === '1Y') {
      for (let i = 0; i < count; i++) {
        const timestampForSlot = new Date(isoTimestamps[i]);
        let maxPercentage = 0;

        for (let cycleIndex = 0; cycleIndex < allCycles.length; cycleIndex++) {
          const cycle = allCycles[cycleIndex];
          const cycleDataMap = cycleAggregatedData.get(cycleIndex);
          if (!cycleDataMap) continue;

          // Check if the current month timestamp belongs to this cycle
          if (timestampForSlot >= cycle.startDate && timestampForSlot <= cycle.endDate) {
            const timeLabelKey = generateTimeLabelKey(timestampForSlot, unit, timezone);
            const rawPoints = cycleDataMap.get(timeLabelKey) || 0;
            const cycleTarget = allCycles[cycleIndex].targetValue || 1;
            const percentage = Math.round((rawPoints / cycleTarget) * 100);
            if (percentage > maxPercentage) maxPercentage = Math.min(100, percentage);
          }
        }

        finalData[i] = maxPercentage;
      }

    } else {
      const cumulativePointsMap = new Map(); // Map<cycleIndex, cumulativePoints>

      for (let i = 0; i < count; i++) {
        const timestampForSlot = new Date(isoTimestamps[i]);
        let assignedCycleIndex = -1;
        let cycleDataMapForSlot = null;

        for (let cycleIndex = 0; cycleIndex < allCycles.length; cycleIndex++) {
          const cycle = allCycles[cycleIndex];
          if (timestampForSlot >= cycle.startDate && timestampForSlot <= cycle.endDate) {
            assignedCycleIndex = cycleIndex;
            cycleDataMapForSlot = cycleAggregatedData.get(cycleIndex);
            break;
          }
        }

        finalCycleIndices[i] = assignedCycleIndex !== -1 ? assignedCycleIndex : null;

        if (assignedCycleIndex !== -1 && cycleDataMapForSlot) {
          const timeLabelKey = generateTimeLabelKey(timestampForSlot, unit, timezone);
          const rawPoints = cycleDataMapForSlot.get(timeLabelKey) || 0;

          // Accumulate points
          const prev = cumulativePointsMap.get(assignedCycleIndex) || 0;
          const cumulative = prev + rawPoints;
          cumulativePointsMap.set(assignedCycleIndex, cumulative);

          const cycleTarget = allCycles[assignedCycleIndex].targetValue || 1;
          finalData[i] = Math.min(100, Math.round((cumulative / cycleTarget) * 100)); // 避免超过 100%
        } else {
          // If no data, continue with the previous value (keep the curve smooth)
          finalData[i] = i > 0 ? finalData[i - 1] : 0;
        }
      }
    }

    return {
      labels,
      fullLabels,
      isoTimestamps,
      data: finalData,
      cycleIndices: finalCycleIndices,
    };
  }
}

module.exports = AnalyticsService; 