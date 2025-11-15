const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const CustomError = require('../utils/customError');
const { splitName } = require('../utils/helper');


exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new CustomError(409, 'User with this email already exists');
    }

    // Split name into firstName and lastName
    const { firstName, lastName } = splitName(name);

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
    });



    res.status(201).json({
      success: true,
      message: 'User created successfully',
    });
  } catch (error) {
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return next(new CustomError(400, validationErrors.join(', ')));
    }

    // Handle duplicate key error (if unique index is violated)
    if (error.code === 11000) {
      return next(new CustomError(409, 'User with this email already exists'));
    }

    // Pass to next error handler
    next(error);
  }
};