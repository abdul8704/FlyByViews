const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const ApiError = require("../utils/ApiError");

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

module.exports = {
    verifyLogin,
};