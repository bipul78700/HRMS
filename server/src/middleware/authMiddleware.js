const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

async function protect(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  if (!token) {
    res.status(401);
    return next(new Error("Missing Authorization Bearer token"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select("-passwordHash");
    if (!user) {
      res.status(401);
      return next(new Error("Invalid token"));
    }
    req.user = user;
    return next();
  } catch (_e) {
    res.status(401);
    return next(new Error("Invalid or expired token"));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error("Unauthorized"));
    }
    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error("Forbidden"));
    }
    return next();
  };
}

module.exports = { protect, requireRole };

