const jwt = require('jsonwebtoken');
require('dotenv').config()

const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "1d" });
}

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_KEY, { expiresIn: "1d" });
}

module.exports = {
    generateToken,
    generateRefreshToken
};