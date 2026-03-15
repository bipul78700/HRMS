const jwt = require("jsonwebtoken");

function signAccessToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign(
    {
      role: user.role,
      employeeId: user.employeeId || null,
    },
    secret,
    {
      subject: String(user._id),
      expiresIn,
    }
  );
}

module.exports = { signAccessToken };

