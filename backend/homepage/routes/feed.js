const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Activity = require('../../models/Activity');
const User = require('../../src/models/user');
const authMiddleware = require('../../middleware/auth');

// GET /api/feed - Combined feed for posts and activities
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const skip = (page - 1) * limit;

    const requestingUserId = new mongoose.Types.ObjectId(req.user.id);

    // Fetch recent posts
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      // Optimization: Fetch a bit more initially if complex filtering/ranking is needed later,
      // but for simple chronological merge, fetching up to the current page*limit is often enough.
      // To be safe and ensure enough items for merging before slicing, fetch more if possible.
      // This limit is on individual queries before merge, not the final response limit.
      .limit(page * limit + 20) // Fetch more to ensure enough items after merge and sort
      .populate('userId', 'name avatar') // Populate author name and avatar
      .populate({ // Populate comment author
        path: 'comments.userId',
        select: 'name avatar' 
      })
      .lean();

    // Fetch recent activities
    const activities = await Activity.find({}) // Fetch all activities for now
      .sort({ createdAt: -1 })
      .limit(page * limit + 20) // Fetch more for merging
      .populate('userId', 'name avatar') // Populate author name and avatar
      .populate({ // Populate comment author
        path: 'comments.userId',
        select: 'name avatar' 
      })
      .lean();

    // Add itemType to each item and prepare for merge
    const typedPosts = posts.map(post => {
      const author = post.userId;
      let isLikedByCurrentUser = false;
      if (requestingUserId && Array.isArray(post.likes)) {
        isLikedByCurrentUser = post.likes.some(likeId => likeId.equals(requestingUserId));
      }
      return {
        ...post,
        id: post._id,
        itemType: 'post',
        authorInfo: author ? {
          _id: author._id,
          id: author._id,
          name: author.name || 'Anonymous',
          avatarUrl: author.avatar || null // Use author.avatar from user model
        } : { name: 'Anonymous', avatarUrl: null, _id: null, id: null },
        // Ensure comments have authorInfo
        comments: Array.isArray(post.comments) ? post.comments.map(comment => {
            const commenter = comment.userId; // Assuming comment.userId is populated or an ID
                                            // If it needs population, it has to be done in Post model or here
            return {
                ...comment,
                id: comment._id,
                // If comment.userId is an object (populated), use its fields
                // If it's just an ID, this structure won't work without further population
                authorInfo: commenter && typeof commenter === 'object' ? {
                    _id: commenter._id,
                    id: commenter._id,
                    name: commenter.name || 'Anonymous',
                    avatarUrl: commenter.avatar || null // Use commenter.avatar from user model
                } : { name: 'Commenter Error', avatarUrl: null } // Fallback if commenter not populated
            };
        }) : [],
        isLikedByUser: isLikedByCurrentUser,
        likesCount: post.likes ? post.likes.length : 0,
      };
    });

    const typedActivities = activities.map(activity => {
      const author = activity.userId;
      let isLikedByCurrentUser = false;
      if (requestingUserId && Array.isArray(activity.likes)) {
        isLikedByCurrentUser = activity.likes.some(likeId => likeId.equals(requestingUserId));
      }
      return {
        ...activity,
        id: activity._id,
        itemType: 'activity',
        authorInfo: author ? {
          _id: author._id,
          id: author._id,
          name: author.name || 'Anonymous',
          avatarUrl: author.avatar || null // Use author.avatar from user model
        } : { name: 'Anonymous', avatarUrl: null, _id: null, id: null },
        // Ensure comments have authorInfo
        comments: Array.isArray(activity.comments) ? activity.comments.map(comment => {
            const commenter = comment.userId;
            return {
                ...comment,
                id: comment._id,
                authorInfo: commenter && typeof commenter === 'object' ? {
                     _id: commenter._id,
                    id: commenter._id,
                    name: commenter.name || 'Anonymous',
                    avatarUrl: commenter.avatar || null // Use commenter.avatar from user model
                } : { name: 'Commenter Error', avatarUrl: null }
            };
        }) : [],
        isLikedByUser: isLikedByCurrentUser,
        likesCount: activity.likes ? activity.likes.length : 0,
      };
    });

    // Combine, sort by date, and then paginate
    const combinedFeed = [...typedPosts, ...typedActivities]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const paginatedFeed = combinedFeed.slice(skip, skip + limit);
    const totalItems = combinedFeed.length; // This is total of initially fetched, not true total in DB for "all"

    // For a more accurate total count for pagination, you'd ideally count all posts and activities in DB.
    // However, for an infinite scroll feed, simply knowing if there's a "next page" based on
    // whether `skip + limit < combinedFeed.length` (from the larger fetch) can be sufficient.
    // Or, if `paginatedFeed.length < limit`, it means we've reached the end of the combined data.

    const totalPostsInDB = await Post.countDocuments({});
    const totalActivitiesInDB = await Activity.countDocuments({});
    const trueTotalItemsInDB = totalPostsInDB + totalActivitiesInDB;


    res.json({
      success: true,
      data: {
        feed: paginatedFeed,
        pagination: {
          page,
          limit,
          // totalItems: totalItems, // Total items in the current combined batch
          totalPages: Math.ceil(trueTotalItemsInDB / limit), // More accurate total pages
          totalItemsInDB: trueTotalItemsInDB,
          hasNextPage: skip + limit < trueTotalItemsInDB // More accurate hasNextPage
        }
      }
    });

  } catch (error) {
    console.error('Error fetching combined feed:', error);
    res.status(500).json({ success: false, message: 'Server error fetching feed', error: error.message });
  }
});

module.exports = router; 