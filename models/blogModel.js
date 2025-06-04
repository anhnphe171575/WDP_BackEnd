const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        
    },
    tag: {
        type: String
    },
    images: [{
        url: String
    }],
}, { timestamps: true });


module.exports = mongoose.model('Blog', blogSchema);

