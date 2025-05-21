// File: backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Adjust path if necessary
const Team = require('../models/team');
const Activity = require('../models/Activity');
const UserTeamTarget = require('../models/userTeamTarget');
const TeamTargetSnapshot = require('../models/TeamTargetSnapshot');
const UserTargetSnapshot = require('../models/UserTargetSnapshot');
const Profile = require('../src/models/profile'); // Corrected import path for Profile model

const { getCurrentCycleInfo, getCycleInfoForTime } = require('../utils/cycleUtils');

/**
 * Service function to record a team's target snapshot.
 * Call this when a team's overall target might change (member join/leave, member updates personal target).
 */
async function recordTeamTargetSnapshot(teamId) {
    try {
        const team = await Team.findById(teamId);
        if (!team) {
            console.warn(`[recordTeamTargetSnapshot] Team not found: ${teamId}`);
            return;
        }

        // Handle different formats of member arrays, compatible with both storing IDs directly and nested objects
        const teamMemberIds = team.members.map(member => {
            // If member is an object and has a user property (nested structure)
            if (member && typeof member === 'object' && member.user) {
                return member.user._id || member.user;
            }
            // If member is directly an ID (string or ObjectId)
            return member;
        });

        const memberTargets = await UserTeamTarget.find({
            teamId: teamId,
            userId: { $in: teamMemberIds }
        });

        const currentGroupTarget = memberTargets.reduce((sum, target) => sum + (target.targetValue || 0), 0);

        await TeamTargetSnapshot.create({
            teamId,
            timestamp: new Date(),
            groupTargetValue: currentGroupTarget
        });

        console.log(`[recordTeamTargetSnapshot] Team target snapshot recorded at ${new Date().toISOString()}`);
    } catch (error) {
        console.error(`[recordTeamTargetSnapshot] Error:`, error.message, error.stack);
    }
}

/**
 * Service function to record a user's personal target snapshot for a specific team.
 * Call this when a user's target for a team is created or updated.
 */
async function recordUserTargetSnapshot(userId, teamId, personalTargetValue) {
    try {
        await UserTargetSnapshot.create({
            userId,
            teamId,
            timestamp: new Date(),
            personalTargetValue
        });

        console.log(`[recordUserTargetSnapshot] User target snapshot recorded at ${new Date().toISOString()}`);
    } catch (error) {
        console.error(`[recordUserTargetSnapshot] Error:`, error.message, error.stack);
    }
}

// --- Helper Functions for Trend Calculation & Label Formatting ---

function getStartTimeFromRange(range, now = new Date()) {
    let startTime;

    switch (range) {
        case '24H':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;

        case '1W': {
            const start = new Date(now);
            start.setUTCDate(start.getUTCDate() - 7);
            start.setUTCHours(0, 0, 0, 0);
            startTime = start;
            break;
        }

        case '1M': {
            const start = new Date(now);
            start.setUTCDate(start.getUTCDate() - 28);
            start.setUTCHours(0, 0, 0, 0);
            startTime = start;
            break;
        }

        case '1Y': {
            startTime = new Date(new Date(now).setUTCFullYear(now.getUTCFullYear() - 1));
            break;
        }

        default: {
            const start = new Date(now);
            start.setUTCDate(start.getUTCDate() - 7);
            start.setUTCHours(0, 0, 0, 0);
            startTime = start;
            break;
        }
    }

    return startTime;
} 

function getTimeIterationIncrement(range) {
    switch (range) {
        case '24H': return 1 * 60 * 60 * 1000; // 1 hour
        case '1W': return 24 * 60 * 60 * 1000; // 1 day
        case '1M': return 4 * 24 * 60 * 60 * 1000; // 4 days
        // For 1Y, iteration is handled differently (monthly)
        default: return 24 * 60 * 60 * 1000; // Default to 1 day
    }
}

// Helper to format relative time labels (simplified version)
function formatRelativeTime(timestamp, now, range, index, totalPoints) {
    const diffMs = now.getTime() - new Date(timestamp).getTime();
    const diffHours = Math.round(diffMs / (60 * 60 * 1000));
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    // const diffMonths = (now.getUTCFullYear() * 12 + now.getUTCMonth()) - (new Date(timestamp).getUTCFullYear() * 12 + new Date(timestamp).getUTCMonth());

    switch (range) {
        case '24H': 
            if (index === totalPoints - 1 && diffMs < getTimeIterationIncrement(range) / 2) {
                return { short: "Now", full: "Now" };
            }
            const dateFor24H = new Date(timestamp);
            const hours = String(dateFor24H.getUTCHours()).padStart(2, '0');
            const minutes = String(dateFor24H.getUTCMinutes()).padStart(2, '0');
        
            const shortLabel = `${diffHours}h`;
            const fullLabel = `${hours}:${minutes} UTC`;
        
            return { short: shortLabel, full: fullLabel };
        
        case '1W':
            const dateFor1W = new Date(timestamp);
            const shortLabel1W = dateFor1W.toLocaleString('default', { weekday: 'short' }); // e.g., "Mon"
            
            const fullLabel1W = dateFor1W.toLocaleDateString('default', {
                month: 'short',
                day: 'numeric'
            });

            return { short: shortLabel1W, full: fullLabel1W };
        case '1M':
            if (index === totalPoints - 1 && diffMs < getTimeIterationIncrement(range) / 2) {
                return { short: "Today", full: "Today" };
            }
            const dateFor1M = new Date(timestamp);
            const day = dateFor1M.getUTCDate();
            const month = dateFor1M.getUTCMonth() + 1;
            const shortLabel1M = `${month}/${day}`;
            return { short: shortLabel1M, full: dateFor1M.toLocaleDateString() };
        case '1Y':
            const dateFor1Y = new Date(timestamp);
            const monthName1Y = dateFor1Y.toLocaleString('default', { month: 'short' });
            return { short: monthName1Y, full: `${monthName1Y}, ${dateFor1Y.getUTCFullYear()}` };
        default:
            return { short: new Date(timestamp).toLocaleDateString(), full: new Date(timestamp).toISOString() };
    }
}

// Helper to calculate completion percentage for a specific full cycle
async function calculateCycleCompletionPercentage(teamId, userId, cycleStartDate, cycleEndDate, allTargetSnapshotsAvailable, isUserTrend) {
    const activitiesInCycle = await Activity.find({
        teamsId: teamId,
        ...(isUserTrend && userId && { userId: userId }),
        createdAt: { $gte: cycleStartDate, $lte: cycleEndDate }
    }).select('points');

    const totalPointsInCycle = activitiesInCycle.reduce((sum, act) => sum + (act.points || 0), 0);

    let targetForCycle = 0;
    const relevantSnapshots = allTargetSnapshotsAvailable
        .filter(s => new Date(s.timestamp) <= cycleEndDate)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort descending by time

    if (relevantSnapshots.length > 0) {
        const snapshotForCycleEnd = relevantSnapshots[0]; // Latest snapshot effective at or before cycle end
        targetForCycle = isUserTrend
            ? snapshotForCycleEnd.personalTargetValue
            : snapshotForCycleEnd.groupTargetValue;
    }
    // If no relevant snapshot, targetForCycle remains 0, leading to 0% completion if points > 0, or 0% if points = 0.

    return targetForCycle > 0
        ? Math.min(parseFloat(((totalPointsInCycle / targetForCycle) * 100).toFixed(2)), 100)
        : 0;

}

// Refactored for 24H, 1W, 1M
async function calculateTrendDataPoints(
    teamCreatedAtDate,
    activitiesInRange,
    targetSnapshots,
    startTime,
    endTime,
    range,
    isUserTrend = false
) {
    const trendDataPoints = [];
    let currentTimeIter = new Date(startTime);
    const iterationIncrement = getTimeIterationIncrement(range);

    while (currentTimeIter <= endTime) {
        // Determine if the current iteration point is "today" in UTC terms
        const isTodayUTC = 
            currentTimeIter.getUTCFullYear() === endTime.getUTCFullYear() &&
            currentTimeIter.getUTCMonth() === endTime.getUTCMonth() &&
            currentTimeIter.getUTCDate() === endTime.getUTCDate();

        // For '1W' and '1M' ranges, if the iteration point is "today", 
        // calculate using the actual current time (endTime) for real-time progress.
        // Otherwise, use the iteration time (currentTimeIter) for historical points.
        const useNowForCalculation = (range === '1W' || range === '1M') && isTodayUTC;
        const effectiveCalculationTime = useNowForCalculation ? endTime : currentTimeIter;

        const cycleInfoForDataPoint = getCycleInfoForTime(teamCreatedAtDate, effectiveCalculationTime);

        const activitiesUpToEffectiveTimeInCycle = activitiesInRange.filter(
            act => new Date(act.createdAt) >= cycleInfoForDataPoint.cycleStartDate && 
                    new Date(act.createdAt) <= effectiveCalculationTime
        );
        const scoreAtEffectiveTime = activitiesUpToEffectiveTimeInCycle.reduce((sum, act) => sum + (act.points || 0), 0);

        let targetAtEffectiveTime = 0;
        // Find the latest snapshot effective at effectiveCalculationTime
        const relevantSnapshotsAtEffectiveTime = targetSnapshots
            .filter(s => new Date(s.timestamp) <= effectiveCalculationTime)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (relevantSnapshotsAtEffectiveTime.length > 0) {
            targetAtEffectiveTime = isUserTrend
                ? relevantSnapshotsAtEffectiveTime[0].personalTargetValue
                : relevantSnapshotsAtEffectiveTime[0].groupTargetValue;
        }
        
        const percentageAtEffectiveTime = targetAtEffectiveTime > 0
            ? Math.min((scoreAtEffectiveTime / targetAtEffectiveTime) * 100, 100)
            : 0;

        trendDataPoints.push({
            timestamp: new Date(currentTimeIter), // Timestamp for the point on the graph remains the iteration time
            value: parseFloat(percentageAtEffectiveTime.toFixed(2)),
            // cycleIndex will be added in the route handler if not '1Y'
        });

        currentTimeIter.setTime(currentTimeIter.getTime() + iterationIncrement);
    }
    return trendDataPoints;
}

// New helper for 1Y trend
async function calculateYearlyTrendDataPoints(teamId, userId, teamCreatedAtDate, endTime, isUserTrend) {
    const yearlyTrendPoints = [];
    
    // Initialize currentMonthStartDate to be the 1st day of the month, 11 months prior to endTime's month.
    let currentMonthIterStart = new Date(endTime);
    currentMonthIterStart.setUTCMonth(currentMonthIterStart.getUTCMonth() - 11);
    currentMonthIterStart.setUTCDate(1);
    currentMonthIterStart.setUTCHours(0, 0, 0, 0);

    const allTargetSnapshotsForYear = isUserTrend && userId
        ? await UserTargetSnapshot.find({ userId, teamId, timestamp: { $gte: currentMonthIterStart, $lte: endTime } }).sort({ timestamp: 1 })
        : await TeamTargetSnapshot.find({ teamId, timestamp: { $gte: currentMonthIterStart, $lte: endTime } }).sort({ timestamp: 1 });

    for (let i = 0; i < 12; i++) {
        const monthTimestamp = new Date(currentMonthIterStart); // This is the 1st of the month we are processing
        const monthEndDate = new Date(currentMonthIterStart);
        monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
        monthEndDate.setUTCDate(0);
        monthEndDate.setUTCHours(23, 59, 59, 999);

        let sumOfCyclePercentagesInMonth = 0;
        let fullyCompletedCycleCountInMonth = 0;
        let totalCyclesConsideredForAverage = 0; // Denominator for average, only completed cycles with target > 0
        let monthSpecificCycleCount = 0; // Total cycles (completed or ongoing) relevant to this month up to endTime

        let cycleIteratorDate = new Date(monthTimestamp < teamCreatedAtDate ? teamCreatedAtDate : monthTimestamp);
        let cycleInfo = getCycleInfoForTime(teamCreatedAtDate, cycleIteratorDate);

        // Adjust to the first cycle that starts in or overlaps the beginning of the month
        while(cycleInfo.cycleEndDate < monthTimestamp && cycleInfo.cycleEndDate < monthEndDate) {
            cycleIteratorDate = new Date(cycleInfo.cycleEndDate.getTime() + 24 * 60 * 60 * 1000);
            cycleInfo = getCycleInfoForTime(teamCreatedAtDate, cycleIteratorDate);
        }
        
        while (cycleInfo.cycleStartDate <= monthEndDate) {
            // Basic validation: cycle must be within team life and overlap with the current iterated month.
            if (cycleInfo.cycleEndDate < teamCreatedAtDate || cycleInfo.cycleStartDate > monthEndDate) {
                const nextDayAfterCycleEnd = new Date(cycleInfo.cycleEndDate.getTime() + 24*60*60*1000);
                if (nextDayAfterCycleEnd > monthEndDate && cycleInfo.cycleStartDate > monthEndDate) break;
                cycleInfo = getCycleInfoForTime(teamCreatedAtDate, nextDayAfterCycleEnd);
                continue;
            }

            // Stop processing cycles for this month if the cycle *starts* after endTime.
            if (new Date(cycleInfo.cycleStartDate) > new Date(endTime)) {
                break; 
            }
            
            // If the cycle starts on or before endTime, it's relevant to be counted in monthSpecificCycleCount.
            // This includes ongoing cycles if their start date is before or at endTime.
            monthSpecificCycleCount++; 

            const isOngoingCycle = new Date(cycleInfo.cycleEndDate) > new Date(endTime);
            if (isOngoingCycle) {
                // if it is the current cycle, we also calculate its completion
                const nowAsEndTime = new Date(endTime); // use now as the end time to calculate the completion
                const cycleCompletion = await calculateCycleCompletionPercentage(
                    teamId, userId, cycleInfo.cycleStartDate, nowAsEndTime, allTargetSnapshotsForYear, isUserTrend
                );

                let targetForThisCycleValue = 0;
                const relevantSnapshots = allTargetSnapshotsForYear
                    .filter(s => new Date(s.timestamp) <= nowAsEndTime)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                if (relevantSnapshots.length > 0) {
                    targetForThisCycleValue = isUserTrend && userId
                        ? relevantSnapshots[0].personalTargetValue
                        : relevantSnapshots[0].groupTargetValue;
                }

                if (targetForThisCycleValue > 0) {
                    sumOfCyclePercentagesInMonth += cycleCompletion;
                    totalCyclesConsideredForAverage++;
                    if (cycleCompletion >= 100) {
                        fullyCompletedCycleCountInMonth++;
                    }
                }

                const nextCycleStartDateAfterNow = new Date(cycleInfo.cycleEndDate.getTime() + 24 * 60 * 60 * 1000);
                if (nextCycleStartDateAfterNow > monthEndDate) break;
                cycleInfo = getCycleInfoForTime(teamCreatedAtDate, nextCycleStartDateAfterNow);
                continue;
            }
            
            // If we reach here, the cycle has ended by 'endTime' and can be used for performance metrics.
            const cycleCompletion = await calculateCycleCompletionPercentage(
                teamId, userId, cycleInfo.cycleStartDate, cycleInfo.cycleEndDate, allTargetSnapshotsForYear, isUserTrend
            );
            
            let targetForThisCycleValue = 0;
            const relevantSnapshotsForCycleTarget = allTargetSnapshotsForYear
                .filter(s => new Date(s.timestamp) <= cycleInfo.cycleEndDate)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            if (relevantSnapshotsForCycleTarget.length > 0) {
                targetForThisCycleValue = isUserTrend && userId
                    ? relevantSnapshotsForCycleTarget[0].personalTargetValue
                    : relevantSnapshotsForCycleTarget[0].groupTargetValue;
            }

            if (targetForThisCycleValue > 0) {
                sumOfCyclePercentagesInMonth += cycleCompletion;
                totalCyclesConsideredForAverage++; 
                if (cycleCompletion >= 100) {
                    fullyCompletedCycleCountInMonth++;
                }
            }
            
            const nextCycleStartDate = new Date(cycleInfo.cycleEndDate.getTime() + 24 * 60 * 60 * 1000);
            if (nextCycleStartDate > monthEndDate) break; 
            cycleInfo = getCycleInfoForTime(teamCreatedAtDate, nextCycleStartDate);
        }

        yearlyTrendPoints.push({
            timestamp: monthTimestamp,
            value: totalCyclesConsideredForAverage > 0 ? parseFloat((sumOfCyclePercentagesInMonth / totalCyclesConsideredForAverage).toFixed(2)) : 0,
            cycleIndex: getCycleInfoForTime(teamCreatedAtDate, monthTimestamp).cycleIndex, 
            cycleCount: monthSpecificCycleCount, 
            fullyCompletedCycleCount: fullyCompletedCycleCountInMonth
        });
        currentMonthIterStart.setUTCMonth(currentMonthIterStart.getUTCMonth() + 1);
    }
    return yearlyTrendPoints;
}

/**
 * @route   GET /api/analytics/overview/:teamId
 * @desc    Get current analytics overview for a team
 * @access  Private
 */
router.get('/overview/:teamId', authMiddleware, async (req, res) => {
    try {
        const { teamId } = req.params;

        // Populate members correctly (since members is an array of ObjectIds)
        const team = await Team.findById(teamId).populate('members', 'id createdAt');
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        const now = new Date();
        const { cycleStartDate, cycleEndDate, timeElapsedInCycleMs, cycleDurationMs } = getCurrentCycleInfo(team.createdAt, now);

        // 1. Calculate Total Score for the current cycle from Activities
        const activities = await Activity.find({
            teamsId: teamId,
            createdAt: { $gte: cycleStartDate, $lte: cycleEndDate }
        }).select('points');

        const totalScore = activities.reduce((sum, act) => sum + (act.points || 0), 0);

        // 2. Calculate current Group Target (from UserTeamTarget for current overview)
        const teamMemberIds = team.members.map(m => m._id); // Directly take _id, no need to wrap

        const memberTargets = await UserTeamTarget.find({
            teamId: teamId,
            userId: { $in: teamMemberIds }
        });

        const groupTarget = memberTargets.reduce((sum, target) => sum + (target.targetValue || 0), 0);

        // 3. % of target
        const percentageOfTarget = groupTarget > 0
            ? Math.min((totalScore / groupTarget) * 100, 100)
            : 0;

        // 4. % of time gone
        const percentageOfTimeGone = cycleDurationMs > 0 
            ? Math.min((timeElapsedInCycleMs / cycleDurationMs) * 100, 100)
            : 0;

        // 5. Respond with rounded values
        res.json({
            totalScore: Math.round(totalScore),
            groupTarget: Math.round(groupTarget),
            percentageOfTarget: Math.round(percentageOfTarget),
            percentageOfTimeGone: Math.round(percentageOfTimeGone),
            cycleStartDateUtc: cycleStartDate.toUTCString(),
            cycleEndDateUtc: cycleEndDate.toUTCString()
        });

    } catch (error) {
        console.error('Error fetching team overview stats:', error.message, error.stack);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/analytics/user-overview/:teamId/:userId
 * @desc    Get current analytics overview for a specific user in a team
 * @access  Private
 */
router.get('/user-overview/:teamId/:userId', authMiddleware, async (req, res) => {
    try {
        const { teamId, userId } = req.params;
    
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
    
        const now = new Date();
        const { cycleStartDate, cycleEndDate, timeElapsedInCycleMs, cycleDurationMs } =
            getCurrentCycleInfo(team.createdAt, now);
    
        // 1. Fetch user's activities within the current cycle
        const userActivities = await Activity.find({
            teamsId: teamId,
            userId: userId,
            createdAt: { $gte: cycleStartDate, $lte: cycleEndDate },
        }).select('points');
    
        const totalScore = userActivities.reduce((sum, act) => sum + (act.points || 0), 0);
    
        // 2. Fetch user's current personal target in this team
        const userTarget = await UserTeamTarget.findOne({ userId, teamId });
    
        const individualTarget = userTarget?.targetValue || 0;
    
        // 3. Calculate % of target and % of time gone
        const percentageOfTarget = individualTarget > 0
            ? Math.min((totalScore / individualTarget) * 100, 100)
            : 0;

        const percentageOfTimeGone = cycleDurationMs > 0
            ? Math.min((timeElapsedInCycleMs / cycleDurationMs) * 100, 100)
            : 0;
    
        // 4. Return result
        res.json({
            totalScore: Math.round(totalScore),
            individualTarget: Math.round(individualTarget),
            percentageOfTarget: Math.round(percentageOfTarget),
            percentageOfTimeGone: Math.round(percentageOfTimeGone),
            cycleStartDateUtc: cycleStartDate.toUTCString(),
            cycleEndDateUtc: cycleEndDate.toUTCString(),
        });
    } catch (error) {
        console.error('Error fetching user overview stats:', error.message, error.stack);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/analytics/member-progress/:teamId
 * @desc    Get current cycle scores for all members in a team for leaderboard
 * @access  Private
 */
router.get('/member-progress/:teamId', authMiddleware, async (req, res) => {
    try {
        const { teamId } = req.params;

        const team = await Team.findById(teamId).populate('members', 'name email createdAt');
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        const now = new Date();
        // Use team's createdAt for consistent cycle calculation across all members
        const { cycleStartDate, cycleEndDate } = getCurrentCycleInfo(team.createdAt, now);

        // Fetch all activities for the team in the current cycle
        const activitiesInCycle = await Activity.find({
            teamsId: teamId,
            createdAt: { $gte: cycleStartDate, $lte: cycleEndDate }
        }).select('userId points createdAt'); // Select points

        // Fetch profiles for all members in the team
        const memberIds = team.members.map(member => member._id);
        const profiles = await Profile.find({ user: { $in: memberIds } }).select('user avatarUrl');
        const profileMap = new Map(profiles.map(p => [p.user.toString(), p.avatarUrl]));

        // Calculate scores for each member
        const memberScores = team.members.map(member => {
            if (!member) return null;

            const memberActivities = activitiesInCycle.filter(
                act => act.userId.toString() === member._id.toString()
            );
            const totalMemberScore = memberActivities.reduce((sum, act) => sum + (act.points || 0), 0);
            
            const avatarUrl = profileMap.get(member._id.toString());

            return {
                userId: member._id,
                displayName: member.name || (member.email ? member.email.split('@')[0] : 'Unnamed User'),
                score: totalMemberScore,
                avatarUrl: avatarUrl || null // Add avatarUrl here
            };
        }).filter(Boolean);

        memberScores.sort((a, b) => b.score - a.score);

        res.json(memberScores);

    } catch (error) {
        console.error('Error fetching member progress:', error.message, error.stack);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/analytics/timeline/:teamId
 * @desc    Get trend data for a team
 * @query   range: '24H', '1W', '1M', '1Y'
 * @access  Private
 */
router.get('/timeline/:teamId', authMiddleware, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { range = '1W' } = req.query;
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        const teamCreatedAtDate = new Date(team.createdAt);
        const now = new Date(); // This is our endTime for yearly calculations
        let rawTrendDataPoints;

        if (range === '1Y') {
            // startTime from getStartTimeFromRange is not directly used by calculateYearlyTrendDataPoints for month iteration anymore
            // but it's kept here if other logic might depend on the full 1-year span for other data fetching (not currently the case for yearly)
            // const startTime = getStartTimeFromRange(range, now); 
            rawTrendDataPoints = await calculateYearlyTrendDataPoints(
                teamId, null, teamCreatedAtDate, now, false // Pass now (endTime) directly
            );
        } else {
            const startTime = getStartTimeFromRange(range, now); // startTime needed for non-1Y ranges

            const { cycleStartDate } = getCycleInfoForTime(teamCreatedAtDate, startTime);
            const activitiesInRange = await Activity.find({
                teamsId: teamId,
                createdAt: { $gte: cycleStartDate, $lte: now }
            }).sort({ createdAt: 1 }).select('points createdAt');
            const targetSnapshots = await TeamTargetSnapshot.find({
                teamId: teamId,
                timestamp: { $lte: now }
            }).sort({ timestamp: 1 }).select('timestamp groupTargetValue');
            rawTrendDataPoints = await calculateTrendDataPoints(
                teamCreatedAtDate, activitiesInRange, targetSnapshots, startTime, now, range, false
            );
        }

        const labels = [];
        const fullLabels = [];
        const isoTimestamps = [];
        const dataValues = [];
        const cycleIndices = [];
        const yearlyDataObjects = [];

        rawTrendDataPoints.forEach((point, index) => {
            const relTime = formatRelativeTime(point.timestamp, now, range, index, rawTrendDataPoints.length);
            labels.push(relTime.short);
            fullLabels.push(relTime.full);
            isoTimestamps.push(new Date(point.timestamp).toISOString());
            cycleIndices.push(point.cycleIndex !== undefined ? point.cycleIndex : getCycleInfoForTime(teamCreatedAtDate, point.timestamp).cycleIndex);
            
            if (range === '1Y') {
                yearlyDataObjects.push({
                    value: point.value,
                    cycleCount: point.cycleCount,
                    fullyCompletedCycleCount: point.fullyCompletedCycleCount
                });
            } else {
                dataValues.push(point.value);
            }
        });

        res.json({
            success: true,
            data: {
                labels,
                fullLabels,
                isoTimestamps,
                data: range === '1Y' ? yearlyDataObjects : dataValues,
                cycleIndices
            },
            message: "Timeline data fetched successfully."
        });
    } catch (error) {
        console.error('Error fetching team timeline data:', error.message, error.stack);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/analytics/user-timeline/:teamId/:userId
 * @desc    Get trend data for a specific user within a team
 * @query   range: '24H', '1W', '1M', '1Y'
 * @access  Private
 */
router.get('/user-timeline/:teamId/:userId', authMiddleware, async (req, res) => {
    try {
        const { teamId, userId } = req.params;
        const { range = '1W' } = req.query;
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        const teamCreatedAtDate = new Date(team.createdAt);
        
        const now = new Date(); // This is our endTime
        let rawTrendDataPoints;

        if (range === '1Y') {
            rawTrendDataPoints = await calculateYearlyTrendDataPoints(
                teamId, userId, teamCreatedAtDate, now, true // Pass now (endTime) directly
            );
        } else {
            const startTime = getStartTimeFromRange(range, now);

            const { cycleStartDate } = getCycleInfoForTime(teamCreatedAtDate, startTime);
            const activitiesInRange = await Activity.find({
                teamsId: teamId,
                userId: userId,
                createdAt: { $gte: cycleStartDate, $lte: now }
            }).sort({ createdAt: 1 }).select('points createdAt userId');
            const targetSnapshots = await UserTargetSnapshot.find({
                teamId: teamId,
                userId: userId,
                timestamp: { $lte: now }
            }).sort({ timestamp: 1 }).select('timestamp personalTargetValue');
            rawTrendDataPoints = await calculateTrendDataPoints(
                teamCreatedAtDate, activitiesInRange, targetSnapshots, startTime, now, range, true
            );
        }

        const labels = [];
        const fullLabels = [];
        const isoTimestamps = [];
        const dataValues = [];
        const cycleIndices = [];
        const yearlyDataObjects = [];

        rawTrendDataPoints.forEach((point, index) => {
            const relTime = formatRelativeTime(point.timestamp, now, range, index, rawTrendDataPoints.length);
            labels.push(relTime.short);
            fullLabels.push(relTime.full);
            isoTimestamps.push(new Date(point.timestamp).toISOString());
            cycleIndices.push(point.cycleIndex !== undefined ? point.cycleIndex : getCycleInfoForTime(teamCreatedAtDate, point.timestamp).cycleIndex);

            if (range === '1Y') {
                yearlyDataObjects.push({
                    value: point.value,
                    cycleCount: point.cycleCount,
                    fullyCompletedCycleCount: point.fullyCompletedCycleCount
                });
            } else {
                dataValues.push(point.value);
            }
        });

        res.json({
            success: true,
            data: {
                labels,
                fullLabels,
                isoTimestamps,
                data: range === '1Y' ? yearlyDataObjects : dataValues,
                cycleIndices
            },
            message: "Timeline data fetched successfully."
        });
    } catch (error) {
        console.error('Error fetching user timeline data:', error.message, error.stack);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = {
    analyticsRouter: router,
    recordTeamTargetSnapshot,
    recordUserTargetSnapshot
}; 