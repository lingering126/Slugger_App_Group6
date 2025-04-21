const express = require('express');
const router = express.Router();
const Group = require('../models/group');
const authMiddleware = require('../middleware/auth');

// Create a new group
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      description,
      targetName,
      targetMentalValue,
      targetPhysicalValue,
      dailyLimitPhysical = 100,
      dailyLimitMental = 100
    } = req.body;

    const userId = req.user.userId;

    const group = new Group({
      name,
      description,
      targetName,
      targetMentalValue,
      targetPhysicalValue,
      dailyLimitPhysical,
      dailyLimitMental,
      members: [userId]
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create group', error: error.message });
  }
});

// Join an existing group
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.userId;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'Already a member' });
    }
    group.members.push(userId);
    await group.save();
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Failed to join group', error: error.message });
  }
});

// Get all groups the user is a member of
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const groups = await Group.find({ members: userId });
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get groups', error: error.message });
  }
});

// Get all groups
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get groups', error: error.message });
  }
});

// Leave a group
router.post('/leave', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.userId;
    
    console.log(`User ${userId} attempting to leave group ${groupId}`);
    
    if (!groupId) {
      console.error('No groupId provided in request body');
      return res.status(400).json({ message: 'Group ID is required' });
    }
    
    const group = await Group.findById(groupId);
    
    if (!group) {
      console.error(`Group not found with ID: ${groupId}`);
      return res.status(404).json({ message: 'Group not found' });
    }
    
    console.log(`Group found: ${group.name}, members: ${group.members}`);
    
    // Check if user is a member
    const isMember = group.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      console.error(`User ${userId} is not a member of group ${groupId}`);
      return res.status(400).json({ message: 'Not a member of this group' });
    }
    
    // Remove user from group members
    const originalMemberCount = group.members.length;
    group.members = group.members.filter(member => member.toString() !== userId.toString());
    
    console.log(`Removed user ${userId} from group. Original members: ${originalMemberCount}, New members: ${group.members.length}`);
    
    await group.save();
    console.log(`Group ${groupId} saved successfully after member removal`);
    
    res.status(200).json({ 
      message: 'Successfully left the group', 
      group,
      membersRemoved: originalMemberCount - group.members.length
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Failed to leave group', error: error.message });
  }
});

module.exports = router;