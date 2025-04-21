const express = require('express');
const router = express.Router();
const { AppError } = require('../../middleware/errorHandler');
const Post = require('../models/Post');
const mongoose = require('mongoose');

// Get all posts
router.get('/', async (req, res, next) => {
    try {
        console.log('Fetching posts with query:', req.query);
        const { visibility, teamId } = req.query;
        
        const query = {};
        if (visibility) {
            query.visibility = visibility;
            if (visibility === 'team' && teamId) {
                query.teamId = teamId;
            }
        }

        console.log('Final query:', query);
        
        const posts = await Post.find(query)
            .populate('userId', 'username')
            .sort({ createdAt: -1 });
            
        console.log(`Found ${posts.length} posts`);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        next(new AppError('Failed to fetch posts', 500));
    }
});

// Create a new post
router.post('/', async (req, res, next) => {
    try {
        console.log('\n=== Creating New Post ===');
        console.log('Request body:', req.body);
        console.log('User from auth:', req.user);

        // Get userId from auth middleware
        const userId = req.user.id;
        if (!userId) {
            console.error('No user ID found in request');
            throw new AppError('User not authenticated', 401);
        }

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.error('Invalid user ID format:', userId);
            throw new AppError('Invalid user ID format', 400);
        }

        const { type, content, channelType, teamId } = req.body;
        
        // Validate required fields
        if (!type || !content) {
            console.error('Missing required fields:', { type, content });
            throw new AppError('Type and content are required', 400);
        }

        // Map channelType to visibility
        const visibility = channelType || 'public';
        console.log('Post visibility:', visibility);

        // Create post data
        const postData = {
            userId,
            type,
            content: content.trim(),
            visibility
        };

        // Add teamId if visibility is team
        if (visibility === 'team') {
            if (!teamId) {
                console.error('Missing teamId for team post');
                throw new AppError('Team ID is required for team posts', 400);
            }
            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                console.error('Invalid team ID format:', teamId);
                throw new AppError('Invalid team ID format', 400);
            }
            postData.teamId = teamId;
        }

        // Handle activity type post
        if (type === 'activity') {
            const { activityType, duration } = req.body;
            console.log('Activity details:', { activityType, duration });
            
            if (!activityType || duration === undefined) {
                console.error('Missing activity details');
                throw new AppError('Activity type and duration are required for activity posts', 400);
            }
            
            postData.activityType = activityType;
            postData.duration = parseInt(duration, 10);
            
            // Calculate points based on duration
            postData.points = Math.floor(postData.duration);
            console.log('Calculated points:', postData.points);
        }

        console.log('Creating post with data:', postData);
        const post = new Post(postData);
        
        // Validate post data against schema
        const validationError = post.validateSync();
        if (validationError) {
            console.error('Validation error:', validationError);
            throw new AppError(validationError.message, 400);
        }

        const savedPost = await post.save();
        console.log('Post saved successfully with ID:', savedPost._id);
        
        // Populate user information before sending response
        const populatedPost = await Post.findById(savedPost._id)
            .populate('userId', 'username')
            .populate('comments.userId', 'username');

        if (!populatedPost) {
            console.error('Failed to retrieve populated post');
            throw new AppError('Failed to retrieve created post', 500);
        }

        console.log('Sending response with populated post');
        res.status(201).json(populatedPost);
        console.log('=== Post Creation Complete ===\n');
    } catch (error) {
        console.error('Post creation error:', error);
        if (error instanceof AppError) {
            next(error);
        } else if (error.name === 'ValidationError') {
            next(new AppError(error.message, 400));
        } else {
            next(new AppError('Failed to create post: ' + error.message, 500));
        }
    }
});

// Update a post
router.put('/:id', async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            throw new AppError('Post not found', 404);
        }

        // Prevent updating critical fields
        delete req.body.userId; // Don't allow changing the post owner
        
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('userId', 'username');
        
        res.json(updatedPost);
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else if (error.name === 'ValidationError') {
            next(new AppError(error.message, 400));
        } else {
            next(new AppError('Failed to update post', 500));
        }
    }
});

// Delete a post
router.delete('/:id', async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            throw new AppError('Post not found', 404);
        }

        await Post.findByIdAndDelete(req.params.id);
        res.status(204).end();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else {
            next(new AppError('Failed to delete post', 500));
        }
    }
});

// Like/Unlike a post
router.post('/:id/like', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const post = await Post.findById(req.params.id);
        if (!post) {
            throw new AppError('Post not found', 404);
        }

        const likeIndex = post.likes.indexOf(userId);
        if (likeIndex === -1) {
            // Like the post
            post.likes.push(userId);
        } else {
            // Unlike the post
            post.likes.splice(likeIndex, 1);
        }

        await post.save();
        res.json({ likes: post.likes.length });
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else {
            next(new AppError('Failed to update post likes', 500));
        }
    }
});

// Add comment to a post
router.post('/:id/comments', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { content } = req.body;
        if (!content) {
            throw new AppError('Content is required for comments', 400);
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            throw new AppError('Post not found', 404);
        }

        post.comments.push({ userId, content });
        await post.save();
        
        const updatedPost = await Post.findById(req.params.id)
            .populate('userId', 'username')
            .populate('comments.userId', 'username');
            
        res.json(updatedPost);
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else {
            next(new AppError('Failed to add comment', 500));
        }
    }
});

module.exports = router; 