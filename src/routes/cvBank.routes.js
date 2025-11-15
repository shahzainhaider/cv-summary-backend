const express = require('express');
const { getCVBank } = require('../controllers/cvBank.controller');
const router = express.Router();

router.get('/', getCVBank)

module.exports = router;