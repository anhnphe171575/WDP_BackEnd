const mongoose = require('mongoose');

const Blog = require('../models/blogModel.js');
require('../models/userModel.js');
const { cloudinary } = require('../config/cloudinary.js');

// Create new blog
exports.createBlog = async (req, res) => {
    try {
        let images = [];
        
        // Handle multiple image uploads
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: 'blogs',
                });
                images.push({ url: result.secure_url });
            }
        }

        const blogData = {
            ...req.body,
            images
        };

        const blog = new Blog(blogData);
        const savedBlog = await blog.save();

        res.status(201).json(savedBlog);
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get all blogs
exports.getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find()
            .populate('author', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(blogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single blog
exports.getBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id)
            .populate('author', 'name email');

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        res.status(200).json(blog);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update blog
exports.updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Handle image updates
        if (req.files && req.files.length > 0) {
            // Delete old images from Cloudinary
            for (let image of blog.images) {
                const publicId = image.url.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }

            // Upload new images
            const newImages = [];
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: 'blogs',
                });
                newImages.push({ url: result.secure_url });
            }
            blog.images = newImages;
        }

        // Update other fields
        Object.keys(req.body).forEach(key => {
            blog[key] = req.body[key];
        });

        const updatedBlog = await blog.save();
        res.status(200).json(updatedBlog);
    } catch (error) {
        // If there's an error and new images were uploaded, delete them
        if (req.files) {
            for (const file of req.files) {
                await cloudinary.uploader.destroy(file.filename);
            }
        }
        res.status(400).json({ message: error.message });
    }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Check if user is the author
        if (blog.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this blog' });
        }

        // Delete images from Cloudinary
        for (let image of blog.images) {
            const publicId = image.url.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
        }

        await Blog.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Blog deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
