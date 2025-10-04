const User = require('../models/User.model');
const { ApiError } = require('../utils/ApiError');
const bcrypt = require("bcrypt");
require("dotenv").config();

const createNewUser = async (userData) => {
    const { username, email, password } = userData;

    const hashedpass = await bcrypt.hash(
        password,
        Number(process.env.HASH_SALT)
    );

    const newUser = new User({
        username: username,
        email: email,
        passwordHash: hashedpass,
    });

    try {
        await newUser.save();
    } 
    catch (err) {
        if (err.code === 11000) 
            throw new ApiError(400, "Email already exists");
    
        throw err; // bubble up unexpected error
    }

    return {
        success: true,
        message: "User registered successfully.",
    };
};

const verifyLogin = async (email, password) => {
  console.log("Verifying login for:", email);
    const userData = await User.findOne(
        { email: email },
        {
            passwordHash: 1,
        }
    );
console.log("User data found:", userData);
    if (!userData)
        throw new ApiError(400, "User not found with this email");

    const verify = await bcrypt.compare(password, userData.passwordHash);

    if (!verify) throw new ApiError(400, "Wrong Password");

    return {
        success: true,
        message: "credentials matched.",
    };
};

const getUserByEmail = async (email) => {
    return await User.findOne({ email: email });
};

const passwordReset = async (email, password) => {
    const hashedpass = await bcrypt.hash(
        password,
        Number(process.env.HASH_SALT)
    );

    await User.updateOne(
        { email: email },
        {
            passwordHash: hashedpass,
        }
    );

    return { success: true, message: "password changed" };
};

module.exports = {
    verifyLogin,
    getUserByEmail,
    createNewUser,
    passwordReset
};