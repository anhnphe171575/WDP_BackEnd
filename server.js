const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const mongoose = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const blogRoute = require('./routes/blogRoute');
const productRoute = require('./routes/productRoute');
const categoriesRoute = require('./routes/categoriesRoute');
const bannerRoute = require('./routes/bannerRoute');
const authRoute = require('./routes/authRoute');
const orderRoute = require('./routes/orderRoute')
const { setupSocket } = require('./config/socket.io');  // Import socket.io setup
const userRoute = require('./routes/userRoute'); // ✅ Đã giữ lại dòng này
const cartRoute = require('./routes/cartRoute');
const reviewRoute = require('./routes/reviewRoute');



const app = express();
const server = http.createServer(app);
const io = new Server(server);
// Initialize Socket.IO
setupSocket(server);
// Middleware to make io available in req
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "WDP API Documentation"
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Define routes
app.use('/api/blogs', blogRoute);
app.use('/api/banners', bannerRoute);
app.use('/api/auth', authRoute);
app.use('/api/products', productRoute);
app.use('/api/categories', categoriesRoute);
app.use('/api/users', userRoute);
app.use('/api/orders',orderRoute)
app.use('/api/cart', cartRoute);
app.use('/api/reviews', reviewRoute);

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});
