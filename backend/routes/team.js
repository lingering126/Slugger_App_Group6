const express = require('express');
const router = express.Router();
const Team = require('../models/team');
const authMiddleware = require('../middleware/auth');
const UserTarget = require('../models/userTarget');
const UserTeamTarget = require('../models/userTeamTarget');
const { recordTeamTargetSnapshot } = require('./analytics');

// Create a new team
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      description,
      targetName,
      weeklyLimitPhysical = 7,
      weeklyLimitMental = 7
    } = req.body;

    const userId = req.user.id; 
    console.log(`Attempting to create team with name: "${name}", target: "${targetName}", creatorId: "${userId}"`);
    console.log(`Request body for team creation:`, req.body);

    const teamData = {
      name,
      description,
      targetName,
      weeklyLimitPhysical,
      weeklyLimitMental,
      members: [userId]
    };
    
    console.log("Team data to be saved:", teamData);

    const team = new Team(teamData);

    console.log("Attempting to save team...");
    await team.save();
    console.log("Team saved successfully:", team);
    res.status(201).json(team);
  } catch (error) {
    console.error('Error caught in POST /api/teams route:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.errors) { // Mongoose validation errors
      console.error('Validation errors:', error.errors);
    }
    res.status(500).json({ message: 'Failed to create team', error: error.message, details: error.errors });
  }
});

// Join an existing team by ID
router.post('/join', authMiddleware, async (req, res) => {
  try {
    // Support both team and group terminology for backward compatibility
    const teamId = req.body.teamId || req.body.groupId;
    const userId = req.user.id; // Changed from req.user.userId to req.user.id
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.members.includes(userId)) {
      return res.status(400).json({ message: 'Already a member' });
    }
    team.members.push(userId);
    await team.save();
    res.status(200).json(team);
  } catch (error) {
    res.status(500).json({ message: 'Failed to join team', error: error.message });
  }
});

// Join an existing team by teamId (6-digit ID)
router.post('/join-by-id', authMiddleware, async (req, res) => {
  try {
    // Support both team and group terminology for backward compatibility
    const teamId = req.body.teamId || req.body.groupId;
    const userId = req.user.id; // Changed from req.user.userId to req.user.id
    
    console.log(`User ${userId} attempting to join team with ID: ${teamId}`);
    
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' });
    }
    
    // Find team by the 6-digit ID
    const team = await Team.findOne({ teamId: teamId });
    
    if (!team) {
      console.log(`No team found with ID: ${teamId}`);
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if user is already a member
    const isMember = team.members.some(member => member.toString() === userId.toString());
    if (isMember) {
      console.log(`User ${userId} is already a member of team ${teamId}`);
      return res.status(400).json({ message: 'Already a member of this team' });
    }
    
    // Add user to team members
    team.members.push(userId);
    await team.save();
    
    console.log(`User ${userId} successfully joined team ${teamId}`);
    res.status(200).json(team);
  } catch (error) {
    console.error(`Error joining team by ID: ${error.message}`);
    res.status(500).json({ message: 'Failed to join team', error: error.message });
  }
});

// Get all teams the user is a member of
router.get('/', async (req, res) => {
  console.log('==== GET /api/teams START ====');
  try {
    // Safely extract user ID with validation
    if (!req.user) {
      console.error('[GET /teams] req.user is missing - auth middleware may not be working properly');
      return res.status(401).json({ message: 'Authentication error: User not identified' });
    }
    
    const userId = req.user.id || req.user.userId || req.user._id;
    if (!userId) {
      console.error('[GET /teams] User ID not found in req.user:', req.user);
      return res.status(401).json({ message: 'Authentication error: User ID not found' });
    }
    
    console.log(`[GET /teams] Finding teams for user: ${userId}`);
    
    const teams = await Team.find({ members: userId }).populate('members', 'email username name');
    console.log(`[GET /teams] Found ${teams.length} teams for user ${userId}`);
    
    console.log('==== GET /api/teams END - SUCCESS ====');
    res.status(200).json(teams);
  } catch (error) {
    console.error('==== GET /api/teams END - ERROR ====');
    console.error('[GET /teams] Error:', error);
    res.status(500).json({ message: 'Failed to get teams', error: error.message });
  }
});

// Get all teams
router.get('/all', authMiddleware, async (req, res) => {
  try {
    // Populate members with user information including name
    const teams = await Team.find().populate('members', 'email username name'); // Added username
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get teams', error: error.message });
  }
});

// Get a specific team by ID
router.get('/:teamId', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('members', 'email username name');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    // Consider adding a check here if the user requesting is a member, if non-members shouldn't see details.
    // For now, allowing any authenticated user to fetch team details by ID.
    res.status(200).json(team);
  } catch (error) {
    console.error(`Error fetching team by ID ${req.params.teamId}:`, error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid team ID format' });
    }
    res.status(500).json({ message: 'Failed to get team details', error: error.message });
  }
});

// Update team information
router.put('/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id; // Changed from req.user.userId to req.user.id
    
    console.log(`User ${userId} attempting to update team ${teamId}`);
    
    const team = await Team.findById(teamId);
    if (!team) {
      console.error(`Team not found with ID: ${teamId}`);
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if user is a member
    const isMember = team.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      console.error(`User ${userId} is not a member of team ${teamId}`);
      return res.status(403).json({ message: 'Not authorized to update this team' });
    }
    
    // Update team information
    if (name) team.name = name;
    if (description) team.description = description;
    
    await team.save();
    console.log(`Team ${teamId} updated successfully`);
    
    res.status(200).json(team);
  } catch (error) {
    console.error(`Error updating team: ${error.message}`);
    res.status(500).json({ message: 'Failed to update team', error: error.message });
  }
});

// Update team targets
router.put('/:teamId/targets', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { targetName, weeklyLimitPhysical, weeklyLimitMental } = req.body;
    const userId = req.user.id; // Changed from req.user.userId to req.user.id
    
    console.log(`User ${userId} attempting to update targets for team ${teamId}`);
    
    const team = await Team.findById(teamId);
    if (!team) {
      console.error(`Team not found with ID: ${teamId}`);
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if user is a member
    const isMember = team.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      console.error(`User ${userId} is not a member of team ${teamId}`);
      return res.status(403).json({ message: 'Not authorized to update this team' });
    }
    
    // Update team targets
    if (targetName) team.targetName = targetName;
    if (weeklyLimitPhysical !== undefined) team.weeklyLimitPhysical = weeklyLimitPhysical;
    if (weeklyLimitMental !== undefined) team.weeklyLimitMental = weeklyLimitMental;
    
    // Manually trigger target value recalculation
    await team.updateTargetValue();
    
    console.log(`Team ${teamId} targets updated successfully`);
    
    res.status(200).json(team);
  } catch (error) {
    console.error(`Error updating team targets: ${error.message}`);
    res.status(500).json({ message: 'Failed to update team targets', error: error.message });
  }
});

// Get team target value
router.get('/:teamId/target', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id; // Changed from req.user.userId to req.user.id
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if user is a member
    const isMember = team.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this team' });
    }
    
    // Force recalculation of target value if requested
    if (req.query.recalculate === 'true') {
      await team.updateTargetValue();
    }
    
    res.status(200).json({
      targetName: team.targetName,
      targetValue: team.targetValue,
      weeklyLimitPhysical: team.weeklyLimitPhysical,
      weeklyLimitMental: team.weeklyLimitMental
    });
  } catch (error) {
    console.error(`Error getting team target: ${error.message}`);
    res.status(500).json({ message: 'Failed to get team target', error: error.message });
  }
});

// Manually update team target value
router.post('/:teamId/recalculate-target', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id; // Changed from req.user.userId to req.user.id
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if user is a member
    const isMember = team.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized for this team' });
    }
    
    // Recalculate team target value based on members' personal targets
    await team.updateTargetValue();
    
    res.status(200).json({
      targetName: team.targetName,
      targetValue: team.targetValue
    });
  } catch (error) {
    console.error(`Error recalculating team target: ${error.message}`);
    res.status(500).json({ message: 'Failed to recalculate team target', error: error.message });
  }
});

// Leave a team
router.post('/leave', authMiddleware, async (req, res) => {
  try {
    // Support both team and group terminology for backward compatibility
    const teamId = req.body.teamId || req.body.groupId;
    const userId = req.user.id; // Changed from req.user.userId to req.user.id
    
    console.log(`User ${userId} attempting to leave team ${teamId}`);
    
    if (!teamId) {
      console.error('No teamId provided in request body');
      return res.status(400).json({ message: 'Team ID is required' });
    }
    
    const team = await Team.findById(teamId);
    if (!team) {
      console.error(`Team not found with ID: ${teamId}`);
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if user is a member
    const memberIndex = team.members.findIndex(member => member.toString() === userId.toString());
    if (memberIndex === -1) {
      console.error(`User ${userId} is not a member of team ${teamId}`);
      return res.status(400).json({ message: 'Not a member of this team' });
    }
    
    // Remove user from team members
    team.members.splice(memberIndex, 1);
    await team.save();
    
    // Record team target snapshot, because the member list has changed
    await recordTeamTargetSnapshot(team._id);

    console.log(`User ${userId} successfully left team ${teamId}`);
    res.status(200).json({ message: 'Successfully left team' });
  } catch (error) {
    console.error(`Error leaving team: ${error.message}`);
    res.status(500).json({ message: 'Failed to leave team', error: error.message });
  }
});

// Delete a team
router.delete('/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id; // Changed from req.user.userId to req.user.id
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if user is a member
    const isMember = team.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to delete this team' });
    }
    
    await Team.findByIdAndDelete(teamId);
    res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete team', error: error.message });
  }
});

// Get team activities and personal targets
router.get('/:teamId/activities', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    
    console.log(`Getting team activities for team ${teamId} and user ${userId}`);
    
    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if user is a member
    const isMember = team.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this team' });
    }
    
    // Get all team members' user IDs
    const memberIds = team.members;
    console.log(`Team has ${memberIds.length} members`);
    console.log('Member IDs:', memberIds);
    
    // Get personal targets for all members specifically for this team
    const memberTeamTargets = await UserTeamTarget.find({ 
      teamId: teamId
    });
    
    console.log(`Found ${memberTeamTargets.length} team-specific targets`);
    memberTeamTargets.forEach(target => {
      console.log(`User ${target.userId.toString()}: Target ${target.targetValue}`);
    });
    
    // Fall back to global targets if team-specific targets are not found
    const memberGlobalTargets = await UserTarget.find({ 
      userId: { $in: memberIds } 
    });
    
    console.log(`Found ${memberGlobalTargets.length} global targets`);
    
    // Calculate current cycle based on team creation date
    const teamCreationDate = new Date(team.createdAt);
    const now = new Date();
    const msSinceCreation = now.getTime() - teamCreationDate.getTime();
    const daysSinceCreation = Math.floor(msSinceCreation / (1000 * 60 * 60 * 24));
    const currentCycleNumber = Math.floor(daysSinceCreation / 7);
    
    const cycleStart = new Date(teamCreationDate);
    cycleStart.setUTCDate(teamCreationDate.getUTCDate() + currentCycleNumber * 7);
    
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setUTCDate(cycleStart.getUTCDate() + 7);
    
    console.log(`Current cycle: ${currentCycleNumber}`);
    console.log(`Cycle date range: ${cycleStart.toISOString()} to ${cycleEnd.toISOString()}`);
    
    // Get activities for all members in this team for the current cycle only
    const Activity = require('../models/Activity');
    const activities = await Activity.find({
      userId: { $in: memberIds },
      status: 'completed',
      createdAt: { $gte: cycleStart, $lt: cycleEnd }, // Only include activities from current cycle
      // We're including activities with this teamId or with no teamId at all
      $or: [
        { teamId: teamId },
        { teamId: { $exists: false } },
        { teamId: null }
      ]
    });
    
    console.log(`Found ${activities.length} completed activities for team members in the current cycle`);
    
    // Calculate when the current cycle ends
    const cycleEndTime = cycleEnd.getTime();
    const nowTime = now.getTime();
    const msUntilCycleEnd = cycleEndTime - nowTime;
    
    // Use Math.floor instead of Math.ceil for consistent calculation
    const daysUntilCycleEnd = Math.floor(msUntilCycleEnd / (1000 * 60 * 60 * 24));
    const hoursUntilCycleEnd = Math.floor((msUntilCycleEnd % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    // Aggregate data by member
    const membersData = [];
    for (const memberId of memberIds) {
      const memberIdStr = memberId.toString();
      console.log(`Processing member ${memberIdStr}`);
      
      // Try team-specific target first, fall back to global target
      const teamTargetDoc = memberTeamTargets.find(t => t.userId.toString() === memberIdStr);
      const globalTargetDoc = memberGlobalTargets.find(t => t.userId.toString() === memberIdStr);
      
      // Use team target if found, otherwise fall back to global target or default to 3
      const personalTarget = teamTargetDoc ? teamTargetDoc.targetValue : 
                             (globalTargetDoc ? globalTargetDoc.targetValue : 3);
      
      console.log(`Member ${memberIdStr} personal target: ${personalTarget} (${teamTargetDoc ? 'team-specific' : (globalTargetDoc ? 'global' : 'default')})`);
      
      // Count completed activities
      const memberActivities = activities.filter(a => a.userId.toString() === memberIdStr);
      
      membersData.push({
        userId: memberIdStr,
        personalTarget,
        completedActivities: memberActivities.length
      });
    }
    
    // Calculate totals
    const totalTarget = membersData.reduce((sum, member) => sum + member.personalTarget, 0);
    const totalCompleted = membersData.reduce((sum, member) => sum + member.completedActivities, 0);
    
    // Update team target value in database
    team.targetValue = totalTarget;
    await team.save();
    
    console.log('Returning team activities data:');
    console.log('- Total target:', totalTarget);
    console.log('- Total completed:', totalCompleted);
    console.log('- Members data:', membersData);
    console.log('- Current cycle ends in:', `${daysUntilCycleEnd} days, ${hoursUntilCycleEnd} hours`);
    
    res.status(200).json({
      teamId,
      members: membersData,
      totalTarget,
      totalCompleted,
      cycleInfo: {
        currentCycle: currentCycleNumber,
        cycleStart: cycleStart.toISOString(),
        cycleEnd: cycleEnd.toISOString(),
        daysRemaining: daysUntilCycleEnd,
        hoursRemaining: hoursUntilCycleEnd
      }
    });
  } catch (error) {
    console.error(`Error getting team activities: ${error.message}`);
    res.status(500).json({ message: 'Failed to get team activities', error: error.message });
  }
});

// Export the router
module.exports = router;
