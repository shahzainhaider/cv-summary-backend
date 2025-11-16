const express = require('express');
const { getCVBank, uploadCvs, getCVById, deleteCV } = require('../controllers/cvBank.controller');
const { uploadMultiple } = require('../middleware/upload.middleware');
const uploadErrorHandler = require('../middleware/uploadErrorHandler');
const protectedRoute = require('../middleware/auth.middleware');
const router = express.Router();

// All CV Bank routes require authentication
router.use(protectedRoute);

// Upload multiple CV files
router.post('/upload', uploadMultiple, uploadErrorHandler, uploadCvs);

// Get all CVs for authenticated user
router.get('/', getCVBank);

// Get single CV by ID
router.get('/:id', getCVById);

// Delete CV by ID
router.delete('/:id', deleteCV);

module.exports = router;