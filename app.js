const express = require('express');
const cors = require('cors');
const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000', // URL của frontend
  credentials: true
}));

// ... existing code ... 