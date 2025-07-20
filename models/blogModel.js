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
        required: false
    },
    tag: {
        type: String
    },
    images: [{
        url: String
    }],
    views: {
        type: Number,
        default: 0
      }
}, { timestamps: true });


module.exports = mongoose.model('Blog', blogSchema);

