const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/login", authController.handleLogin);
// router.post("/signup", authController.handleSignup);
// router.post("/forgot-password", authController.handleForgotPassword);
// router.post("/verify-otp", authController.handleVerifyOTP);
// router.post("/reset-password", authController.handleResetPassword);

module.exports = router;