/**
 * Calculates the current cycle's start and end dates for a team.
 * A cycle is 7 days long, starting from UTC 00:00 of the team's creation day.
 * Example: If team created on 2023-01-04 15:00:00 UTC (Wednesday),
 * Cycle 1: 2023-01-04 00:00:00 UTC to 2023-01-10 23:59:59.999 UTC
 * Cycle 2: 2023-01-11 00:00:00 UTC to 2023-01-17 23:59:59.999 UTC
 */
function getCurrentCycleInfo(teamCreatedAt, now = new Date()) {
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const referenceDate = new Date(teamCreatedAt);
    referenceDate.setUTCHours(0, 0, 0, 0); // Anchor to UTC 00:00 of the creation day

    const referenceTime = referenceDate.getTime();
    const nowTime = now.getTime();

    if (nowTime < referenceTime) {
        // This case implies 'now' is before the very first cycle even starts (e.g. team created 00:05, now is 00:02)
        // Treat as being at the beginning of the first cycle.
        return {
            cycleStartDate: new Date(referenceTime),
            cycleEndDate: new Date(referenceTime + sevenDaysInMs - 1),
            timeElapsedInCycleMs: 0,
            cycleDurationMs: sevenDaysInMs,
        };
    }

    const msSinceReference = nowTime - referenceTime;
    const currentCycleIndex = Math.floor(msSinceReference / sevenDaysInMs); // 0-indexed

    const cycleStartTimeMs = referenceTime + currentCycleIndex * sevenDaysInMs;
    const cycleStartDate = new Date(cycleStartTimeMs);
    const cycleEndDate = new Date(cycleStartTimeMs + sevenDaysInMs - 1); // Includes the full 7th day

    const timeElapsedInCycleMs = nowTime - cycleStartTimeMs;

    return {
        cycleStartDate,
        cycleEndDate,
        timeElapsedInCycleMs: Math.max(0, timeElapsedInCycleMs), // Ensure non-negative
        cycleDurationMs: sevenDaysInMs,
    };
}

/**
 * Calculates cycle information for a specific target time.
 * A cycle is 7 days long, starting from UTC 00:00 of the team's creation day.
 */
function getCycleInfoForTime(teamCreatedAt, targetTime) {
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const referenceDate = new Date(teamCreatedAt);
    referenceDate.setUTCHours(0, 0, 0, 0); // Anchor to UTC 00:00 of the creation day

    const referenceTime = referenceDate.getTime();
    const targetTimestamp = new Date(targetTime).getTime();

    if (targetTimestamp < referenceTime) {
        // Target time is before the first cycle even starts.
        // Consider it part of the first cycle (index 0) for simplicity or error handling.
        // Or, decide if this case should return an error or specific flags.
        // For now, aligns with getCurrentCycleInfo's behavior for "now" being before reference.
        return {
            cycleIndex: 0,
            cycleStartDate: new Date(referenceTime),
            cycleEndDate: new Date(referenceTime + sevenDaysInMs - 1),
        };
    }

    const msSinceReference = targetTimestamp - referenceTime;
    const cycleIndex = Math.floor(msSinceReference / sevenDaysInMs); // 0-indexed

    const cycleStartTimeMs = referenceTime + cycleIndex * sevenDaysInMs;
    const cycleStartDate = new Date(cycleStartTimeMs);
    const cycleEndDate = new Date(cycleStartTimeMs + sevenDaysInMs - 1); // Includes the full 7th day

    return {
        cycleIndex,
        cycleStartDate,
        cycleEndDate,
    };
}

module.exports = { getCurrentCycleInfo, getCycleInfoForTime }; 