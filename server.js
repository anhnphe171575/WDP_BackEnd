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
const { setupSocket, getIO } = require('./config/socket.io');
const { initializeCronJobs } = require('./services/cronService');

const blogRoute = require('./routes/blogRoute');
const productRoute = require('./routes/productRoute');
const categoriesRoute = require('./routes/categoriesRoute');
const bannerRoute = require('./routes/bannerRoute');
const authRoute = require('./routes/authRoute');
const userRoute = require('./routes/userRoute'); 
const voucherRoute = require('./routes/voucherRoute');
const orderRoute = require('./routes/orderRoute')
const cartRoute = require('./routes/cartRoute');
const reviewRoute = require('./routes/reviewRoute');
const paymentRoute = require('./routes/paymentRoute');
const messageRoute = require('./routes/messageRoute');
const attributeRoute = require('./routes/attributeRoute');
const wishlistRoute = require('./routes/wishlistRoute');
const notifiRoute = require('./routes/notificationRoute');
const chatbotRoute = require('./routes/chatbotRoute');
const statisticsRoute = require('./routes/statisticsRoute');
const ticketRoute = require('./routes/ticketRoute');
const marketingRoute = require('./routes/marketingRoute');

const app = express();
const server = http.createServer(app);
// Initialize Socket.IO
setupSocket(server);
// Middleware to make io available in req
app.use((req, res, next) => {
    req.io = getIO();
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
app.use('/api/attributes', attributeRoute);
app.use('/api/users', userRoute); 
app.use('/api/vouchers', voucherRoute);
app.use('/api/users', userRoute);
app.use('/api/orders',orderRoute)
app.use('/api/cart', cartRoute);
app.use('/api/reviews', reviewRoute);
app.use('/api/payment',paymentRoute);
app.use('/api/messages', messageRoute);
app.use('/api/wishlist', wishlistRoute);
app.use('/api/notification', notifiRoute);
app.use('/api/chatbot', chatbotRoute);
app.use('/api/statistics', statisticsRoute);
app.use('/api/tickets', ticketRoute);
app.use('/api/marketing', marketingRoute);
const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
  
  // Khởi tạo cron jobs sau khi server đã start
  initializeCronJobs();
});
