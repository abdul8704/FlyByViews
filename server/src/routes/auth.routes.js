const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/login", authController.handleLogin);
router.post("/signup", authController.handleSignup);
router.post("/send-otp", authController.sendOTPController);
router.post("/verify-otp", authController.handleVerifyOTP);
router.post("/reset-password", authController.handleResetPassword);
router.post("/refresh-token", authController.handleRefreshToken);

module.exports = router;