const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const forgotController = require('../controllers/forgotPasswordController');

// LOGIN
router.post('/:role/login', authController.login);

// FORGOT PASSWORD FLOW
router.post('/forgot-password', forgotController.forgotPassword);
router.post('/verify-reset-otp', forgotController.verifyResetOtp);
router.post('/reset-password', forgotController.resetPassword);

module.exports = router;
