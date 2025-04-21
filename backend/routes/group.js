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

module.exports = router;