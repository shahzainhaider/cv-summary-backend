const CVBank = require('../models/cvBank.model');
const CustomError = require('../utils/customError');
const path = require('path');
const fs = require('fs');
const errorHandler = require('../utils/errorHandler');
const { extractText } = require('../utils/textExtractor');
const { extractPositionAndSummary, generateSummaryWithOllama } = require('../services/aiService');

/**
 * Upload multiple CV files
 */
exports.uploadCvs = async (req, res, next) => {
  try {
    // Handle both 'cvs' and 'files' field names
    let files = [];
    if (req.files) {
      // If using upload.fields, files will be an object with arrays
      if (req.files.cvs && Array.isArray(req.files.cvs)) {
        files = [...files, ...req.files.cvs];
      }
      if (req.files.files && Array.isArray(req.files.files)) {
        files = [...files, ...req.files.files];
      }
      // If using upload.array, files will be a direct array
      if (Array.isArray(req.files)) {
        files = req.files;
      }
    }

    if (!files || files.length === 0) {
      throw new CustomError(400, 'No files uploaded. Please use field name "cvs" or "files" in your form-data.');
    }

    if (!req.user || !req.user._id) {
      throw new CustomError(401, 'User not authenticated');
    }

    const userId = req.user._id;
    const uploads = [];

    // Process each uploaded file
    for (const file of files) {
      let fullPath = path.resolve(file.path); // Ensure absolute path
      
      fullPath = fullPath.replace(/\\/g, '/');
      
      const fileUrl = `file:///${fullPath}`;

      const existingCV = await CVBank.findOne({
        userId: userId,
        path: fileUrl,
      });

      if (existingCV) {
        // File already exists, skip or update
        continue;
      }

      // Extract text, position, and generate summary
      let summary = '';
      let position = 'Not Specified';
      try {
        // Extract text from CV file
        const extractedText = await extractText(file.path, file.mimetype);
        
        if (extractedText && extractedText.trim().length > 50) {
          // Extract position and generate summary using Ollama AI
          console.log(`Extracting position and generating summary for CV: ${file.originalname}`);
          const result = await extractPositionAndSummary(extractedText);
          position = result.position || 'Not Specified';
          summary = result.summary || '';
          console.log(`Position extracted: ${position}, Summary generated successfully for: ${file.originalname}`);
        } else {
          summary = 'Unable to extract sufficient text from CV for summary generation.';
          position = 'Not Specified';
          console.warn(`Insufficient text extracted from: ${file.originalname}`);
        }
      } catch (summaryError) {
        console.error(`Error generating summary/position for ${file.originalname}:`, summaryError);
        
        // Try to extract position separately if summary generation fails
        try {
          const extractedText = await extractText(file.path, file.mimetype);
          if (extractedText && extractedText.trim().length > 50) {
            const { extractPositionFromCV } = require('../services/aiService');
            position = await extractPositionFromCV(extractedText);
          }
        } catch (positionError) {
          console.error(`Error extracting position: ${positionError.message}`);
          position = 'Not Specified';
        }
        
        // Set appropriate error message based on error type
        if (summaryError.status === 503) {
          summary = 'Summary generation service unavailable. Please ensure Ollama is running.';
        } else if (summaryError.status === 404) {
          summary = `Summary generation model not found. Error: ${summaryError.message}`;
        } else if (summaryError.message.includes('extract text')) {
          summary = `Failed to extract text from file: ${summaryError.message}`;
        } else {
          summary = `Summary generation failed: ${summaryError.message}. You can retry later.`;
        }
        
        // Continue with upload even if summary generation fails
        // The CV will be saved without summary, which can be regenerated later
      }

      // Create new CV record with position and summary
      const cvRecord = await CVBank.create({
        userId: userId,
        path: fileUrl,
        summary: summary,
        position: position,
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
        position: cvRecord.position,
        summary: cvRecord.summary,
      });
    }

      res.status(201).json({
        success: true,
        message: `${uploads.length} CV file(s) uploaded successfully`,
        data: {
          uploaded: uploads,
          total: files.length,
        },
      });
  } catch (error) {
    // Clean up uploaded files if database save fails
    let filesToCleanup = [];
    if (req.files) {
      if (req.files.cvs) filesToCleanup = [...filesToCleanup, ...req.files.cvs];
      if (req.files.files) filesToCleanup = [...filesToCleanup, ...req.files.files];
      if (Array.isArray(req.files)) filesToCleanup = req.files;
    }
    
    if (filesToCleanup && filesToCleanup.length > 0) {
      filesToCleanup.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (err) {
          console.error(`Error deleting file ${file.path}:`, err);
        }
      });
    }
    errorHandler(res, error, "uploadCvs");
  }
};

/**
 * Get all CVs for the authenticated user
 */
exports.getCVBank = async (req, res, next) => {
  try {
    // if (!req.user || !req.user._id) {
    //   throw new CustomError(401, 'User not authenticated');
    // }

    // const userId = req.user._id;
    
    // Get filter query parameters
    const { position } = req.query;
    
    // Build query
    // const query = { userId: userId, isActive: true };
    const query = {  isActive: true };
    if (position && position.trim() !== '') {
      // Case-insensitive search for position
      query.position = { $regex: position.trim(), $options: 'i' };
    }
    
    const cvs = await CVBank.find(query)
      .sort({ createdAt: -1 })
      .select('_id path summary position originalName mimeType fileSize createdAt updatedAt');

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
 * Get all unique positions for the authenticated user (for filtering)
 */
exports.getPositions = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new CustomError(401, 'User not authenticated');
    }

    const userId = req.user._id;
    
    // Get distinct positions for the user
    const positions = await CVBank.distinct('position', {
      userId: userId,
      isActive: true,
      position: { $nin: ['', 'Not Specified'] } // Exclude empty and default positions
    });

    // Sort positions alphabetically
    const sortedPositions = positions
      .filter(pos => pos && pos.trim() !== '')
      .sort();

    res.status(200).json({
      success: true,
      message: 'Positions retrieved successfully',
      data: sortedPositions,
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

/**
 * Delete multiple CVs by IDs (bulk delete)
 */
exports.deleteBulkCVs = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new CustomError(401, 'User not authenticated');
    }

    const userId = req.user._id;
    const { ids } = req.body;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new CustomError(400, 'Please provide an array of CV IDs to delete');
    }

    // Validate all IDs are strings/valid MongoDB ObjectIds
    const validIds = ids.filter(id => {
      if (typeof id !== 'string' || id.trim() === '') {
        return false;
      }
      // Basic MongoDB ObjectId format validation (24 hex characters)
      return /^[0-9a-fA-F]{24}$/.test(id.trim());
    });

    if (validIds.length === 0) {
      throw new CustomError(400, 'No valid CV IDs provided');
    }

    if (validIds.length !== ids.length) {
      throw new CustomError(400, 'Some CV IDs are invalid. Please provide valid MongoDB ObjectIds.');
    }

    // Find all CVs that belong to the user and match the provided IDs
    const cvs = await CVBank.find({
      _id: { $in: validIds },
      userId: userId,
      isActive: true, // Only delete active CVs
    });

    if (cvs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No CVs found to delete',
      });
    }

    const deletedIds = [];
    const notFoundIds = [];
    const failedDeletes = [];

    // Delete physical files and soft delete in database
    for (const cv of cvs) {
      try {
        // Delete physical file
        let filePath = cv.path;
        
        // Remove file:// protocol if present
        if (filePath.startsWith('file:///')) {
          filePath = filePath.substring(8); // Remove 'file:///'
        } else if (filePath.startsWith('file://')) {
          filePath = filePath.substring(7); // Remove 'file://'
        }
        
        // Normalize path separators for current OS
        filePath = path.normalize(filePath);
        
        // Delete physical file
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileErr) {
            console.error(`Error deleting physical file ${filePath}:`, fileErr);
            // Continue with database deletion even if file deletion fails
          }
        }

        // Soft delete - set isActive to false
        cv.isActive = false;
        await cv.save();
        
        deletedIds.push(cv._id.toString());
      } catch (err) {
        console.error(`Error deleting CV ${cv._id}:`, err);
        failedDeletes.push(cv._id.toString());
      }
    }

    // Find IDs that were requested but not found
    const foundIds = cvs.map(cv => cv._id.toString());
    notFoundIds.push(...validIds.filter(id => !foundIds.includes(id)));

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedIds.length} CV(s)`,
    });
  } catch (error) {
    errorHandler(res, error, "deleteBulkCVs");
  }
};