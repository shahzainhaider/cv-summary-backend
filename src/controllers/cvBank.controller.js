const CVBank = require('../models/cvBank.model');
const CustomError = require('../utils/customError');
const path = require('path');
const fs = require('fs');

/**
 * Upload multiple CV files
 */
exports.uploadCvs = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new CustomError(400, 'No files uploaded');
    }

    if (!req.user || !req.user._id) {
      throw new CustomError(401, 'User not authenticated');
    }

    const userId = req.user._id;
    const uploads = [];

    // Process each uploaded file
    for (const file of req.files) {
      // file.path contains the full absolute path from multer
      // Convert to file:// URL format (e.g., file:///E:/MY/cv-summary/backend/uploads/...)
      let fullPath = path.resolve(file.path); // Ensure absolute path
      
      // Normalize Windows paths: convert backslashes to forward slashes
      fullPath = fullPath.replace(/\\/g, '/');
      
      // Add file:// protocol (triple slash for absolute paths)
      // On Windows, path starts with drive letter (E:/...), so it becomes file:///E:/...
      const fileUrl = `file:///${fullPath}`;

      // Check if CV with same path already exists for this user
      const existingCV = await CVBank.findOne({
        userId: userId,
        path: fileUrl,
      });

      if (existingCV) {
        // File already exists, skip or update
        continue;
      }

      // Create new CV record
      const cvRecord = await CVBank.create({
        userId: userId,
        path: fileUrl,
        summary: '', // Empty for now
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        isActive: true,
      });

      uploads.push({
        id: cvRecord._id,
        path: fileUrl,
        originalName: file.originalname,
        fileSize: file.size,
        summary: cvRecord.summary,
      });
    }

    res.status(201).json({
      success: true,
      message: `${uploads.length} CV file(s) uploaded successfully`,
      data: {
        uploaded: uploads,
        total: req.files.length,
      },
    });
  } catch (error) {
    // Clean up uploaded files if database save fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (err) {
          console.error(`Error deleting file ${file.path}:`, err);
        }
      });
    }
    next(error);
  }
};

/**
 * Get all CVs for the authenticated user
 */
exports.getCVBank = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new CustomError(401, 'User not authenticated');
    }

    const userId = req.user._id;
    const cvs = await CVBank.find({ userId: userId, isActive: true })
      .sort({ createdAt: -1 })
      .select('_id path summary originalName mimeType fileSize createdAt updatedAt');

    res.status(200).json({
      success: true,
      message: 'CVs retrieved successfully',
      data: cvs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single CV by ID
 */
exports.getCVById = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new CustomError(401, 'User not authenticated');
    }

    const { id } = req.params;
    const userId = req.user._id;

    const cv = await CVBank.findOne({ _id: id, userId: userId, isActive: true });

    if (!cv) {
      throw new CustomError(404, 'CV not found');
    }

    res.status(200).json({
      success: true,
      message: 'CV retrieved successfully',
      data: cv,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete CV by ID
 */
exports.deleteCV = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new CustomError(401, 'User not authenticated');
    }

    const { id } = req.params;
    const userId = req.user._id;

    const cv = await CVBank.findOne({ _id: id, userId: userId });

    if (!cv) {
      throw new CustomError(404, 'CV not found');
    }

    // Delete physical file
    // cv.path is stored as file:///E:/MY/... format, so we need to extract the actual path
    let filePath = cv.path;
    
    // Remove file:// protocol if present
    if (filePath.startsWith('file:///')) {
      filePath = filePath.substring(8); // Remove 'file:///'
    } else if (filePath.startsWith('file://')) {
      filePath = filePath.substring(7); // Remove 'file://'
    }
    
    // Normalize path separators for current OS
    filePath = path.normalize(filePath);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Soft delete - set isActive to false
    cv.isActive = false;
    await cv.save();

    res.status(200).json({
      success: true,
      message: 'CV deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};