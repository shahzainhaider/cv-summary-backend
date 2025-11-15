const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const userRoutes = require('./src/routes/user.routes');
const cvBankRoutes = require('./src/routes/cvBank.routes');
const userAuthRoutes = require('./src/routes/userAuth.routes');
const serverConfig = require('./src/config/server.config');
const connectDB = require('./src/config/database');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/auth', userAuthRoutes);
app.use('/api/cv-bank', cvBankRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});


// Start server
app.listen(serverConfig.port, () => {
  console.log(`Server is running on port ${serverConfig.port}`);
  console.log(`Environment: ${serverConfig.nodeEnv}`);
});
