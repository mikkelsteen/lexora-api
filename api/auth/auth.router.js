const express = require("express");
const passport = require("passport");
const router = express.Router();
const authController = require("./auth.controller");
const {
  verifyToken,
  verifySession,
} = require("../../middleware/auth.middleware");

/**
 * @swagger
 * /api/auth/magic-link:
 *   post:
 *     summary: Request magic link for authentication
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Magic link sent successfully
 */
router.post("/magic-link", authController.sendMagicLink);

/**
 * @swagger
 * /api/auth/verify-magic-link:
 *   get:
 *     summary: Verify magic link token
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Magic link verified successfully
 */
router.get("/verify-magic-link", authController.verifyMagicLink);

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth2 authentication
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to Google login
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: true,
  })
);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth2 callback URL
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects after Google authentication
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: true,
  }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

/**
 * @swagger
 * /api/auth/microsoft:
 *   get:
 *     summary: Initiate Microsoft authentication
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to Microsoft login
 */
router.get(
  "/microsoft",
  passport.authenticate("azure", {
    session: true,
  })
);

/**
 * @swagger
 * /api/auth/microsoft/callback:
 *   post:
 *     summary: Microsoft authentication callback URL
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects after Microsoft authentication
 */
router.post(
  "/microsoft/callback",
  passport.authenticate("azure", {
    failureRedirect: "/login",
    session: true,
  }),
  (req, res) => {
    res.redirect("/dashboard");
  }
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token generated
 */
router.post("/refresh-token", authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", verifySession, authController.logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get("/me", verifyToken, authController.getCurrentUser);

module.exports = router;
