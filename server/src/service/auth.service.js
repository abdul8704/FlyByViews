const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const ApiError = require("../utils/ApiError");
const { get } = require("../utils/nodemailer");

const verifyLogin = async (email, password) => {
    const userData = await User.findOne(
        { email: email },
        {
            _id: 1,
            username: 1,
            passwordHash: 1,
        }
    );
    
    if (!userData) 
        throw new ApiError(400, "User not found with this email");

    const verify = await bcrypt.compare(password, userData.passwordHash);

    if (!verify) throw new ApiError(400, "Wrong Password");

    return {
        success: true,
        message: "credentials matched.",
        userData: {
            username: userData.username,
            userid: userData._id,
        },
    };
};

const createNewUser = async (userData) => {
    const { username, email, password } = userData;

    if (await getUserByEmail(email))
        throw new ApiError(400, "Email already exists");

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
        message: "User registered successfully, wait for approval.",
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
    createNewUser,
    getUserByEmail,
    passwordReset
};