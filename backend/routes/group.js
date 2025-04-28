const express = require('express');
const router = express.Router();
const Group = require('../models/group');
const GroupCycleHistory = require('../src/models/group-cycle-history');
const authMiddleware = require('../middleware/auth');
const AnalyticsService = require('../src/analytics/analytics.service');
const analyticsService = new AnalyticsService();

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

// Join an existing group by ID
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

// Join an existing group by groupId (6-digit ID)
router.post('/join-by-id', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.userId;
    
    console.log(`User ${userId} attempting to join group with ID: ${groupId}`);
    
    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required' });
    }
    
    // Find group by the 6-digit ID
    const group = await Group.findOne({ groupId: groupId });
    
    if (!group) {
      console.log(`No group found with ID: ${groupId}`);
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is already a member
    const isMember = group.members.some(member => member.toString() === userId.toString());
    if (isMember) {
      console.log(`User ${userId} is already a member of group ${groupId}`);
      return res.status(400).json({ message: 'Already a member of this group' });
    }
    
    // Add user to group members
    group.members.push(userId);
    await group.save();
    
    console.log(`User ${userId} successfully joined group ${groupId}`);
    res.status(200).json(group);
  } catch (error) {
    console.error(`Error joining group by ID: ${error.message}`);
    res.status(500).json({ message: 'Failed to join group', error: error.message });
  }
});

// Get all groups the user is a member of
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const groups = await Group.find({ members: userId }).populate('members', 'email name');
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get groups', error: error.message });
  }
});

// Get all groups
router.get('/all', authMiddleware, async (req, res) => {
  try {
    // Populate members with user information including name
    const groups = await Group.find().populate('members', 'email name');
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get groups', error: error.message });
  }
});

// Update group information
router.put('/:groupId', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.userId;
    
    console.log(`User ${userId} attempting to update group ${groupId}`);
    
    const group = await Group.findById(groupId);
    if (!group) {
      console.error(`Group not found with ID: ${groupId}`);
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is a member
    const isMember = group.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      console.error(`User ${userId} is not a member of group ${groupId}`);
      return res.status(403).json({ message: 'Not authorized to update this group' });
    }
    
    // Update group information
    if (name) group.name = name;
    if (description) group.description = description;
    
    await group.save();
    console.log(`Group ${groupId} updated successfully`);
    
    res.status(200).json(group);
  } catch (error) {
    console.error(`Error updating group: ${error.message}`);
    res.status(500).json({ message: 'Failed to update group', error: error.message });
  }
});

// Update group targets AND reset cycle
router.put('/:groupId/targets', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { targetName, targetMentalValue, targetPhysicalValue } = req.body;
    const userId = req.user.userId;
    
    console.log(`User ${userId} attempting to update targets for group ${groupId}`);
    
    const group = await Group.findById(groupId);
    if (!group) {
      console.error(`Group not found with ID: ${groupId}`);
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is a member
    const isMember = group.members.some(member => member.toString() === userId.toString());
    if (!isMember) {
      console.error(`User ${userId} is not a member of group ${groupId}`);
      return res.status(403).json({ message: 'Not authorized to update this group' });
    }

    const now = new Date(); // Use exact time for new cycle start

    // Calculate completion percentage for the ending cycle *before* archiving
    let finalPercentage = 0; // Default to 0
    try {
      // Use the group's actual ObjectId (_id)
      finalPercentage = await analyticsService.calculateTargetPercentage(group._id, now);
    } catch (calcError) {
      console.error(`Error calculating final percentage for group ${group._id} before reset:`, calcError);
      // Decide how to handle - maybe proceed with 0%? For now, log and continue.
    }

    // 1. Archive the current cycle (ending now)
    const historyEntry = new GroupCycleHistory({
      groupId: group._id, // Use the group's actual ObjectId
      startDate: group.targetStartDate,
      endDate: now, // Cycle ends now
      targetValue: group.targetValue, // Archive the old target
      completionPercentage: finalPercentage, // Save calculated percentage
    });
    await historyEntry.save();
    console.log(`Archived cycle for group ${group.groupId} (${group._id}) due to manual reset with ${finalPercentage}% completion.`);

    // 2. Calculate new end date (7 days from now)
    const newEndDate = new Date(now);
    newEndDate.setDate(now.getDate() + 7);
    newEndDate.setMilliseconds(newEndDate.getMilliseconds() - 1);

    // 3. Update group document
    group.targetStartDate = now; // New cycle starts now
    group.targetEndDate = newEndDate;

        
    // Update group targets
    if (targetName) group.targetName = targetName;
    if (targetMentalValue !== undefined) group.targetMentalValue = targetMentalValue;
    if (targetPhysicalValue !== undefined) group.targetPhysicalValue = targetPhysicalValue;
    
    await group.save();
    console.log(`Group ${groupId} targets updated successfully`);
    
    res.status(200).json(group);
  } catch (error) {
    console.error(`Error updating group targets: ${error.message}`);
    res.status(500).json({ message: 'Failed to update group targets', error: error.message });
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