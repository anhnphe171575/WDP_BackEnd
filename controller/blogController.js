const mongoose = require('mongoose');

const Blog = require('../models/blogModel.js');
require('../models/userModel.js');
const { cloudinary } = require('../config/cloudinary.js');

// Create new blog
exports.createBlog = async (req, res) => {
    try {
        const { title, description, tag } = req.body;
        const images = req.files ? req.files.map(file => ({ url: file.path })) : [];

        const blog = await Blog.create({
            title,
            description,
            tag,
            images,
            author: req.user._id // Assuming you have user authentication middleware
        });

        res.status(201).json({
            success: true,
            blog
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all blogs
exports.getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find()
            .populate('author', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            blogs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single blog
exports.getBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id)
            .populate('author', 'name email');

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        res.status(200).json({
            success: true,
            blog
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update blog
exports.updateBlog = async (req, res) => {
    try {
        const { title, description, tag } = req.body;
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Check if user is the author
        if (blog.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this blog'
            });
        }

        // Handle image updates
        let images = blog.images;
        if (req.files && req.files.length > 0) {
            // Delete old images from Cloudinary
            for (let image of blog.images) {
                const publicId = image.url.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            // Add new images
            images = req.files.map(file => ({ url: file.path }));
        }

        const updatedBlog = await Blog.findByIdAndUpdate(
            req.params.id,
            {
                title,
                description,
                tag,
                images
            },
            { new: true }
        ).populate('author', 'name email');

        res.status(200).json({
            success: true,
            blog: updatedBlog
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Check if user is the author
        if (blog.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this blog'
            });
        }

        // Delete images from Cloudinary
        for (let image of blog.images) {
            const publicId = image.url.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
        }

        await blog.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Blog deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
