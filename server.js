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
const userRoute = require('./routes/userRoute');

const { setupSocket } = require('./config/socket.io');  // Import socket.io setup

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
setupSocket(server);

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
  origin: "http://localhost:3000", // Chỉ cho phép frontend này gửi request
  credentials: true, // Quan trọng: Cho phép gửi cookie
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


app.use('/api/blogs', blogRoute);
app.use('/api/banners', bannerRoute);
app.use('/api/auth', authRoute);
app.use('/api/products', productRoute);
app.use('/api/categories', categoriesRoute);
app.use('/api/user', userRoute);


const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});