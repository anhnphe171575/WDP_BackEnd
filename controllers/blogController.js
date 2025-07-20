const mongoose = require('mongoose');

const Blog = require('../models/blogModel.js');
const { cloudinary } = require('../config/cloudinary.js');

// Create new blog
exports.createBlog = async (req, res) => {
    try {
        const { title, description, tag } = req.body;
        
        // Log the request data for debugging
        console.log('Request body:', req.body);
        console.log('Files:', req.files);
        
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        // Handle image uploads
        let images = [];
        if (req.files && req.files.length > 0) {
            try {
                images = req.files.map(file => ({ url: file.path }));
            } catch (uploadError) {
                console.error('Error processing uploaded files:', uploadError);
                return res.status(400).json({
                    success: false,
                    message: 'Error processing uploaded files'
                });
            }
        }

        // Create the blog
        const blog = await Blog.create({
            title,
            description,
            tag,
            images
        });

        if (!blog) {
            return res.status(400).json({
                success: false,
                message: 'Failed to create blog'
            });
        }

        res.status(201).json({
            success: true,
            blog
        });
    } catch (error) {
        console.error('Error creating blog:', error);
        // Send a more detailed error response
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create blog',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

// Get all blogs
exports.getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find()
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
        // Tăng views trước khi trả về
        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );

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
        const { title, description, tag, existingImages } = req.body;
        const blogId = req.params.id;

        // Validate required fields
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        // Find the existing blog
        const existingBlog = await Blog.findById(blogId);
        if (!existingBlog) {
            return res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
        }

        // Handle image updates
        let images = [];
        
        // Add existing images that were kept
        if (existingImages) {
            const existingImagesArray = Array.isArray(existingImages) ? existingImages : [existingImages];
            images = existingImagesArray.map(url => ({ url }));
        }

        // Add new images
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({ url: file.path }));
            images = [...images, ...newImages];
        }

        // Delete images that were removed
        if (existingBlog.images && existingBlog.images.length > 0) {
            for (let image of existingBlog.images) {
                if (image.url && !images.some(img => img.url === image.url)) {
                    try {
                        const publicId = image.url.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                    } catch (cloudinaryError) {
                        console.error('Error deleting old image:', cloudinaryError);
                    }
                }
            }
        }

        // Update the blog
        const updatedBlog = await Blog.findByIdAndUpdate(
            blogId,
            {
                title,
                description,
                tag,
                images
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedBlog) {
            return res.status(404).json({
                success: false,
                message: 'Failed to update blog'
            });
        }

        res.status(200).json({
            success: true,
            blog: updatedBlog
        });
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update blog'
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

        // Delete images from Cloudinary if they exist
        if (blog.images && blog.images.length > 0) {
            try {
                for (let image of blog.images) {
                    if (image.url) {
                        const publicId = image.url.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                    }
                }
            } catch (cloudinaryError) {
                console.error('Error deleting images from Cloudinary:', cloudinaryError);
                // Continue with blog deletion even if image deletion fails
            }
        }

        await blog.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Blog deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete blog'
        });
    }
};
