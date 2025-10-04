const asyncHandler = require("express-async-handler");
const authService = require("../service/auth.service");
const authOTP = require("../models/authOTP");
const generateOTP = require("../utils/generateOTP");
const transporter = require("../utils/sendOTP");
const jwtUtils = require("../utils/generateJWT");
const ApiError = require("../utils/ApiError");

const handleLogin = asyncHandler(async (req, res) => {
    console.log("Login request received");
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
            maxAge: 1 * 24 * 60 * 60 * 1000, 
        })

        res.status(200).json({
            success: true,
            message: "Login successfulllll",
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

const sendOTPController = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const otp = generateOTP();

    if (!email)
        throw new ApiError(400, "email is required to send OTP");

    try {
        await authOTP.replaceOne(
            { useremail: email },
            {
                useremail: email,
                otp: otp,
            },
            { upsert: true }
        );

        await transporter.sendOTP(email, otp);
        console.log("OTP sent to:", email);

        res.status(200).json({ success: true, message: "OTP sent successfully" });
    } catch (err) {
        throw new ApiError(500, "Failed to send OTP", err.message);
    }
});

const handleVerifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const storedOTP = await authOTP.findOne({ useremail: email });

    if (storedOTP.otp === Number(otp)) {
        await authOTP.deleteOne({ useremail: email });
        return res
            .status(200)
            .json({ success: true, message: "OTP verified successfully" });
        }

    throw new ApiError(400, "Incorrect OTP");
 
});

const handleSignup = asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;

    if (!username || !email || !password) 
        throw new ApiError(400, "Username, email, password.");
    
    await authService.createNewUser(req.body);
    
    const newuser = await authService.getUserByEmail(email);

    const payload = {
        username: newuser.username,
        userid: newuser._id,
        role: newuser.role,
    };

    const token = jwtUtils.generateToken(payload);
    const refreshToken = jwtUtils.generateRefreshToken(payload);

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
        success: true,
        accessToken: token,
        message: "Signup Successfull",
        userId: newuser._id,
    });
});

const userExists = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await authService.getUserByEmail(email);

    if (user) 
        return res.status(200).json({ success: true, exists: true });
    
    return res.status(200).json({ success: true, exists: false });
});

const handleResetPassword = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password)
        throw new ApiError(400, "Email and new password are required");

    const resetPass = await authService.passwordReset(email, password);
    
    if(resetPass.success === true)
        res.status(201).json({ success: true, message: "Password Changed!!" })
    else
        res.status(500).json({ success: false, message: "Something went wrong", details: resetPass })
})

const handleRefreshToken = asyncHandler((req, res) => { // TODO: debug this function
    const cookies = req.cookies;

    console.log("Cookies received:", cookies);

    if (!cookies?.refreshToken)
        throw new ApiError(401, "Refresh token not found in cookies". req.cookies);

    const refreshToken = cookies.refreshToken;
    
    try {
        const user = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);
        const newToken = jwtUtils.generateToken({ userid: user.userid });
        return res.status(201).json({ success: true, token: newToken });
    } 
    catch (err) {
        throw new ApiError(403, "Invalid or expired refresh token", err.message);
    }
});

module.exports = {
    handleLogin,
    sendOTPController,
    handleVerifyOTP,
    handleSignup,
    userExists,
    handleResetPassword,
    handleRefreshToken,
};