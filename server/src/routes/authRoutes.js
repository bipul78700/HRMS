const express = require("express");
const { body } = require("express-validator");
const { register, login, me, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/register",
  [
    body("name").isString().isLength({ min: 2, max: 120 }).withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isString().isLength({ min: 6, max: 200 }).withMessage("Password must be at least 6 chars"),
  ],
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isString().isLength({ min: 1 }).withMessage("Password is required"),
  ],
  login
);

router.get("/me", protect, me);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email is required")],
  forgotPassword
);

router.post(
  "/reset-password",
  [
    body("token").isString().isLength({ min: 10 }).withMessage("Reset token is required"),
    body("password").isString().isLength({ min: 6, max: 200 }).withMessage("Password must be at least 6 chars"),
  ],
  resetPassword
);

module.exports = router;

