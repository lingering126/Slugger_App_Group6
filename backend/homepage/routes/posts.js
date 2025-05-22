const express = require('express');
const router = express.Router();
const { AppError } = require('../../middleware/errorHandler');
const Post = require('../models/Post');
const mongoose = require('mongoose');

// Get all posts
router.get('/', async (req, res, next) => {
    try {
        console.log('\n=== Fetching Posts ===');
        console.log('Query:', req.query);
        console.log('User ID:', req.user.id);
        
        const { visibility } = req.query;
        const userId = req.user.id;
        
        const query = {};
        if (visibility) {
            query.visibility = visibility;
        }

        console.log('Database query:', query);
        
        const posts = await Post.find(query)
            .populate('userId', 'username name avatarUrl')
            .populate('likes', 'name avatar')
            .populate('comments.userId', 'username name avatarUrl')
            .sort({ createdAt: -1 });
            
        console.log(`Found ${posts.length} posts`);

        // Format posts with like status
        const formattedPosts = await Promise.all(posts.map(async post => {
            const likesData = await post.getLikesData();
            const isLiked = post.isLikedByUser(userId);
            
            console.log(`Post ${post._id} like status:`, {
                likesCount: likesData.count,
                isLikedByUser: isLiked
            });

            // Format comments to include author name
            const formattedComments = post.comments.map(comment => ({
                _id: comment._id,
                content: comment.content,
                author: comment.userId?.name || 'Anonymous',
                createdAt: comment.createdAt
            }));

            return {
                _id: post._id,
                content: post.content,
                userId: post.userId,
                author: post.userId?.name || 'Anonymous',
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                comments: formattedComments,
                visibility: post.visibility,
                likesCount: likesData.count,
                isLikedByUser: isLiked,
                likes: likesData.users
            };
        }));

        console.log('=== Posts Fetch Complete ===\n');
        res.json(formattedPosts);
    } catch (error) {
        console.error('\n=== Posts Fetch Error ===');
        console.error('Error details:', error);
        console.error('=== Error End ===\n');
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

        const { content, visibility = 'public' } = req.body;
        
        // Validate required fields
        if (!content) {
            console.error('Missing required field: content');
            throw new AppError('Content is required', 400);
        }

        // Create post data
        const postData = {
            userId,
            content: content.trim(),
            visibility
        };

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
        
        // Populate user information and get like status
        const populatedPost = await Post.findById(savedPost._id)
            .populate('userId', 'username')
            .populate('comments.userId', 'username');

        if (!populatedPost) {
            console.error('Failed to retrieve populated post');
            throw new AppError('Failed to retrieve created post', 500);
        }

        // Get likes data and format response
        const likesData = await populatedPost.getLikesData();
        const isLiked = populatedPost.isLikedByUser(userId);

        const response = {
            ...populatedPost.toObject(),
            likesCount: likesData.count,
            isLikedByUser: isLiked,
            likes: likesData.users
        };

        console.log('Sending response with populated post');
        res.status(201).json(response);
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

// Like/unlike a post
router.post('/:id/like', async (req, res, next) => {
    try {
        console.log('\n=== Liking Post ===');
        const postId = req.params.id;
        const userId = req.user.id;

        console.log('Post ID:', postId);
        console.log('User ID:', userId);

        const post = await Post.findById(postId);
        if (!post) {
            throw new AppError('Post not found', 404);
        }

        // Toggle like status
        const liked = await post.toggleLike(userId);
        const likesData = await post.getLikesData();

        console.log('Like status:', liked ? 'Liked' : 'Unliked');
        console.log('Total likes:', likesData.count);
        console.log('=== Like Operation Complete ===\n');

        res.json({
            success: true,
            liked: liked,
            likesCount: likesData.count,
            likes: likesData.users
        });
    } catch (error) {
        console.error('Like operation error:', error);
        next(new AppError('Failed to update like status', 500));
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