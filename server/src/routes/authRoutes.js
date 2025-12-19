const express = require('express');
const { signup, login, refresh, logout, googleAuth } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;
