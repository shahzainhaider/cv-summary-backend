const authConfig = require("../config/auth.config");
const User = require("../models/user.model");

const protectedRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new CustomError(401, "Unauthorized");
    }

    // Attempt to verify access token
    let decoded;
    try {
      decoded = jwt.verify(accessToken, authConfig.accessSecret);
    } catch (err) {
      // If access token expired, verify refresh token
      if (
        err.name === "TokenExpiredError" ||
        err.name === "JsonWebTokenError"
      ) {
        try {
          decoded = jwt.verify(refreshToken, authConfig.refreshSecret);
          // Generate new access token
          const newAccessToken = jwt.sign(
            { id: decoded.id },
            authConfig.accessSecret,
            {
              expiresIn: "15m",
            }
          );
          res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            // Always mark as Secure to ensure cookie is only sent over HTTPS
            secure: true,
            sameSite: process.env.NODE_ENV === "development" ? "None" : "strict",
          });
        } catch (refreshErr) {
          throw new CustomError(401, "Unauthorized");
        }
      } else {
        throw err;
      }
    }

    // Find user
    const user = await User.findById(decoded.id, {
      select: ['_id', 'firstName', 'lastName', 'email', 'role', 'isActive'],
    });

    if (!user) {
      throw new CustomError(401, "User not found");
    }



    req.user = user;
    next();
  } catch (error) {
    // Optional: Clear cookies on failure
    // Clear with same attributes to ensure removal in all browsers
    const clearOpts = { httpOnly: true, secure: true, sameSite: "strict", path: "/" };
    try { res.clearCookie("accessToken", clearOpts); } catch (_) { }
    try { res.clearCookie("refreshToken", clearOpts); } catch (_) { }
    return res.status(error.status || 500).json({
      success: false,
      message: error.status === 401 ? "Unauthorized" : error.message,
    });
  }
};

module.exports = protectedRoute;
