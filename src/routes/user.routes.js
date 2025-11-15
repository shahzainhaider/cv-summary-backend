const express = require('express');
const { getUser } = require('../controllers/user.controller');
const { signup } = require('../controllers/userAuth.controller');
const { signupValidation, validate } = require('../utils/validation');
const router = express.Router();

// Auth routes
router.post('/signup', signupValidation, validate, signup);

router.get('/', getUser)

module.exports = router