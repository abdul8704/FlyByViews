const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const ApiError = require('../utils/ApiError')

const authenticateToken = asyncHandler((req, res, next) => {
    const token = req.cookies.accessToken;
    
    if (!token)
        throw new ApiError(401, "Access token not found in cookies");

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = user;
        next();
    } catch (err) {
        throw new ApiError( 401,
            err.name === "TokenExpiredError"
                ? "Token has expired"
                : "Invalid or malformed JWT",
            err.message 
        );
    }
});

module.exports = authenticateToken;
