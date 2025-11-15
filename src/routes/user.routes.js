const express = require('express');
const { getUser } = require('../controllers/user.controller');
const { signup } = require('../controllers/userAuth.controller');
const router = express.Router();

// Auth routes
router.post('/signup', signup)

router.get('/', getUser)

module.exports = router