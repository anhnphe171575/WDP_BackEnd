const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,     // Tên cloud của bạn
    api_key: process.env.CLOUDINARY_KEY,            // API key
    api_secret: process.env.CLOUDINARY_SECRET,       // API secret
});

// Storage config
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        return {
            folder: 'rental_app',
            allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'avif'],
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
            transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto' }
            ],
            resource_type: 'auto'
        };
    }
});

// Multer upload config
const upload = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP and AVIF are allowed.'));
        }
    }
});

module.exports = { cloudinary, upload };
