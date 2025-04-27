const express = require('express');
const router = express.Router();
const Team = require('../models/team');
const auth = require('../middleware/auth');

// Get all teams
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find().populate('members.user', 'name email avatar');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new team
router.post('/', auth, async (req, res) => {
  try {
    const team = new Team({
      name: req.body.name,
      members: [{
        user: req.user._id,
        role: 'leader',
        points: 0
      }]
    });
    const newTeam = await team.save();
    res.status(201).json(newTeam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a specific team
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'name email avatar')
      .populate('goals')
      .populate('forfeits');
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join a team
router.post('/:id/join', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is already a member
    const isMember = team.members.some(member => member.user.toString() === req.user._id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this team' });
    }

    team.members.push({ 
      user: req.user._id, 
      role: 'member',
      points: 0
    });
    const updatedTeam = await team.save();
    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Leave a team
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    const memberIndex = team.members.findIndex(member => member.user.toString() === req.user._id.toString());
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'Not a member of this team' });
    }

    // Remove member
    team.members.splice(memberIndex, 1);
    const updatedTeam = await team.save();
    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a goal
router.post('/:id/goals', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    const isMember = team.members.some(member => member.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this team' });
    }

    team.goals.push({
      title: req.body.title,
      description: req.body.description,
      target: req.body.target,
      type: req.body.type || 'physical',
      current: 0
    });
    const updatedTeam = await team.save();
    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update goal progress
router.patch('/:id/goals/:goalId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const goal = team.goals.id(req.params.goalId);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    if (req.body.title) goal.title = req.body.title;
    if (req.body.description) goal.description = req.body.description;
    if (req.body.target) goal.target = req.body.target;
    if (req.body.type) goal.type = req.body.type;
    if (req.body.current !== undefined) goal.current = req.body.current;

    const updatedTeam = await team.save();
    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a goal
router.delete('/:id/goals/:goalId', auth, async (req, res) => {
  try {
    console.log('Deleting goal:', req.params.goalId);
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    const isMember = team.members.some(member => member.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this team' });
    }

    const goalIndex = team.goals.findIndex(goal => goal._id.toString() === req.params.goalId);
    if (goalIndex === -1) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    team.goals.splice(goalIndex, 1);
    const updatedTeam = await team.save();
    console.log('Goal deleted successfully');
    res.json(updatedTeam);
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add a forfeit
router.post('/:id/forfeits', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    const isMember = team.members.some(member => member.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this team' });
    }

    team.forfeits.push({
      description: req.body.description,
      points: req.body.points
    });
    const updatedTeam = await team.save();
    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a forfeit
router.patch('/:id/forfeits/:forfeitId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const forfeit = team.forfeits.id(req.params.forfeitId);
    if (!forfeit) {
      return res.status(404).json({ message: 'Forfeit not found' });
    }

    if (req.body.description) forfeit.description = req.body.description;
    if (req.body.points) forfeit.points = req.body.points;

    const updatedTeam = await team.save();
    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a forfeit
router.delete('/:id/forfeits/:forfeitId', auth, async (req, res) => {
  try {
    console.log('Deleting forfeit:', req.params.forfeitId);
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is a member
    const isMember = team.members.some(member => member.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this team' });
    }

    const forfeitIndex = team.forfeits.findIndex(forfeit => forfeit._id.toString() === req.params.forfeitId);
    if (forfeitIndex === -1) {
      return res.status(404).json({ message: 'Forfeit not found' });
    }

    team.forfeits.splice(forfeitIndex, 1);
    const updatedTeam = await team.save();
    console.log('Forfeit deleted successfully');
    res.json(updatedTeam);
  } catch (error) {
    console.error('Error deleting forfeit:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update member points
router.patch('/:id/members/:memberId/points', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const member = team.members.id(req.params.memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    member.points = req.body.points;
    const updatedTeam = await team.save();
    res.json(updatedTeam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a team
router.delete('/:id', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is the team leader
    const isLeader = team.members.some(member => 
      member.user.toString() === req.user._id.toString() && member.role === 'leader'
    );
    if (!isLeader) {
      return res.status(403).json({ message: 'Only team leader can delete the team' });
    }

    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 