const asyncHandler = require("express-async-handler");
const authService = require("../service/auth.service");
const authOTP = require("../models/authOTP");
const generateOTP = require("../utils/generateOTP");
const transporter = require("../utils/sendOTP");
const jwtUtils = require("../utils/generateJWT");
const ApiError = require("../utils/ApiError");

const handleLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        throw new ApiError(401, "Provide credentials!!");

    const verifyLogin = await authService.verifyLogin(email, password);

    if (verifyLogin.success === true) {
        const token = jwtUtils.generateToken(verifyLogin.userData);
        const refreshToken = jwtUtils.generateRefreshToken(verifyLogin.userData);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false, // TODO: change to true during de[ployment]
            sameSite: "Lax",
            maxAge: 1 * 24 * 60 * 60 * 1000, // 1 days
        });

        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            maxAge: 1 * 24 * 60 * 60 * 1000, // TODO: change to 15 mins during deployment 1 days
        });

        if (verifyLogin.role === null) {
            return res
                .status(200)
                .json({ success: false, message: "Not admitted yet" });
        }

        res.status(200).json({
            success: true,
            message: "Login successful",
            credentials: verifyLogin.userData
        });
    } 
    else if (verifyLogin.message === "Wrong Password") {
        throw new ApiError(401, "Wrong Password");
    }

    else if (verifyLogin.message === "User not found") 
        throw new ApiError(401, "User not found");
    else 
        throw new ApiError(500, "IDK what went wrong. Internal Server Error", { reason: err.message });
});

module.exports = {
    handleLogin,
};