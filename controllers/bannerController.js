const Banner = require('../models/bannerModel');
const { cloudinary } = require('../config/cloudinary');

// Create a new banner
exports.createBanner = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an image' });
        }

        const bannerData = {
            ...req.body,
            imageUrl: req.file.path // Cloudinary URL
        };

        const banner = new Banner(bannerData);
        const savedBanner = await banner.save();
        res.status(201).json(savedBanner);
    } catch (error) {
        // If there's an error, delete the uploaded image from Cloudinary
        if (req.file) {
            await cloudinary.uploader.destroy(req.file.filename);
        }
        res.status(400).json({ message: error.message });
    }
};

// Get all banners
exports.getAllBanners = async (req, res) => {
    try {
        const banners = await Banner.find();
        res.status(200).json(banners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a single banner by ID
exports.getBannerById = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }
        res.status(200).json(banner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a banner
exports.updateBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        // If new image is uploaded, delete old image from Cloudinary
        if (req.file) {
            // Delete old image
            const oldImagePublicId = banner.imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(oldImagePublicId);
            
            // Update with new image
            banner.imageUrl = req.file.path;
        }

        // Update other fields
        Object.keys(req.body).forEach(key => {
            banner[key] = req.body[key];
        });

        const updatedBanner = await banner.save();
        res.status(200).json(updatedBanner);
    } catch (error) {
        // If there's an error and new image was uploaded, delete it
        if (req.file) {
            await cloudinary.uploader.destroy(req.file.filename);
        }
        res.status(400).json({ message: error.message });
    }
};

// Delete a banner
exports.deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        // Delete image from Cloudinary
        // const imagePublicId = banner.imageUrl.split('/').pop().split('.')[0];
        // await cloudinary.uploader.destroy(imagePublicId);

        // Delete banner from database
        await Banner.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Banner deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
