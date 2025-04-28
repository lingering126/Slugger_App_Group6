const express = require('express');
const router = express.Router();
const Team = require('../models/team');
const authMiddleware = require('../middleware/auth');

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

    const userId = req.user.userId;

    const team = new Team({
      name,
      description,
      targetName,
      weeklyLimitPhysical,
      weeklyLimitMental,
      members: [userId]
    });

    await team.save();
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create team', error: error.message });
  }
});

// Join an existing team by ID
router.post('/join', authMiddleware, async (req, res) => {
  try {
    // Support both team and group terminology for backward compatibility
    const teamId = req.body.teamId || req.body.groupId;
    const userId = req.user.userId;
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
    const userId = req.user.userId;
    
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
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const teams = await Team.find({ members: userId }).populate('members', 'email name');
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get teams', error: error.message });
  }
});

// Get all teams
router.get('/all', authMiddleware, async (req, res) => {
  try {
    // Populate members with user information including name
    const teams = await Team.find().populate('members', 'email name');
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get teams', error: error.message });
  }
});

// Update team information
router.put('/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.userId;
    
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
    const userId = req.user.userId;
    
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
    const userId = req.user.userId;
    
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
    const userId = req.user.userId;
    
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
    const userId = req.user.userId;
    
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
    const userId = req.user.userId;
    
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

// Export the router
module.exports = router;