const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const pool = require("../../db");
const authConfig = require("../../config/auth.config");
const {
  successResponse,
  errorResponse,
  ServiceErrorTypes,
  AppError,
} = require("../../utils/response.handler");

// Store for recently used tokens to prevent multiple verifications
const recentlyUsedTokens = new Map();

// Email transporter
const transporter = nodemailer.createTransport(authConfig.email);

// Helper function to generate tokens
const generateTokens = async (userId) => {
  const accessToken = jwt.sign({ id: userId }, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.expiresIn,
  });

  const refreshToken = crypto.randomBytes(40).toString("hex");
  const refreshExpires = new Date();
  refreshExpires.setDate(refreshExpires.getDate() + 7); // 7 days

  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [userId, refreshToken, refreshExpires]
  );

  return { accessToken, refreshToken };
};

// Magic Link Authentication
const sendMagicLink = async (req, res, next) => {
  const { email } = req.body;

  try {
    console.log("Sending magic link for email:", email);

    if (!email) {
      throw new AppError(
        "Email is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    // Check if user exists
    let result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    console.log("User lookup result:", result.rows);

    let user;

    if (result.rows.length === 0) {
      console.log("Creating new user for email:", email);
      // Create new user
      result = await pool.query(
        "INSERT INTO users (email, auth_type) VALUES ($1, $2) RETURNING *",
        [email, "magic-link"]
      );
      console.log("New user created:", result.rows[0]);
    }
    user = result.rows[0];

    // Generate magic link token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Increased to 1 hour for testing

    console.log("Attempting to insert magic link token:", {
      userId: user.id,
      token: token,
      expiresAt: expires,
    });

    try {
      const insertResult = await pool.query(
        "INSERT INTO magic_link_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *",
        [user.id, token, expires]
      );
      console.log(
        "Successfully inserted magic link token:",
        insertResult.rows[0]
      );
    } catch (dbError) {
      console.error("Database error inserting token:", {
        error: dbError,
        sql: dbError.query,
        parameters: dbError.parameters,
      });
      throw dbError;
    }

    // Send magic link email
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
    const magicLink = `${FRONTEND_URL}/auth/magic-link/callback?token=${token}`;

    console.log("Sending magic link email:", {
      to: email,
      magicLink: magicLink,
    });

    await transporter.sendMail({
      from: authConfig.email.from,
      to: email,
      subject: "Your Magic Link",
      html: `
        <p>Click the link below to sign in:</p>
        <a href="${magicLink}">Sign In</a>
        <p>This link will expire in 1 hour.</p>
        <p>Debug info: Token=${token}</p>
      `,
    });

    console.log("Magic link email sent successfully");

    res.json(
      successResponse({
        message: "Magic link sent successfully",
        debug: {
          token,
          expiresAt: expires,
        },
      })
    );
  } catch (error) {
    console.error("Error in sendMagicLink:", {
      error: error,
      stack: error.stack,
      email: email,
    });
    next(error);
  }
};

// Verify Magic Link
const verifyMagicLink = async (req, res, next) => {
  const { token } = req.query;

  try {
    console.log("Verifying magic link token:", token);

    if (!token) {
      throw new AppError(
        "Token is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    // Check if token was recently used successfully
    if (recentlyUsedTokens.has(token)) {
      const userData = recentlyUsedTokens.get(token);
      console.log(
        "Token was recently used successfully, returning cached response"
      );
      return res.json(successResponse(userData, "Authentication successful"));
    }

    // First check if token exists
    let tokenResult;
    try {
      tokenResult = await pool.query(
        "SELECT t.*, u.email FROM magic_link_tokens t INNER JOIN users u ON t.user_id = u.id WHERE t.token = $1",
        [token]
      );
      console.log("Token lookup result:", tokenResult.rows);
    } catch (dbError) {
      console.error("Database error looking up token:", {
        error: dbError,
        sql: dbError.query,
        parameters: dbError.parameters,
      });
      throw dbError;
    }

    if (tokenResult.rows.length === 0) {
      console.log("Token not found in database");
      throw new AppError(
        "Invalid or already used token",
        ServiceErrorTypes.AUTH_ERROR,
        401
      );
    }

    const tokenData = tokenResult.rows[0];

    // Then check if token is expired
    const now = new Date();
    const expiryDate = new Date(tokenData.expires_at);

    console.log("Token expiry check:", {
      now: now,
      expiryDate: expiryDate,
      isExpired: expiryDate < now,
    });

    if (expiryDate < now) {
      throw new AppError(
        `Token expired at ${tokenData.expires_at}`,
        ServiceErrorTypes.AUTH_ERROR,
        401
      );
    }

    // Generate JWT tokens
    const tokens = await generateTokens(tokenData.user_id);
    console.log("Generated JWT tokens for user:", tokenData.user_id);

    // Update last login
    try {
      await pool.query(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
        [tokenData.user_id]
      );
      console.log("Updated last login timestamp");
    } catch (dbError) {
      console.error("Error updating last login:", dbError);
      // Continue even if update fails
    }

    // Delete used token
    try {
      await pool.query("DELETE FROM magic_link_tokens WHERE token = $1", [
        token,
      ]);
      console.log("Token deleted successfully");
    } catch (dbError) {
      console.error("Error deleting token:", dbError);
      // Continue even if delete fails
    }

    // Set session
    req.session.userId = tokenData.user_id;

    // Create response data
    const responseData = {
      ...tokens,
      user: {
        id: tokenData.user_id,
        email: tokenData.email,
      },
    };

    // Store token in recently used cache with a 5-minute expiry
    recentlyUsedTokens.set(token, responseData);
    setTimeout(() => recentlyUsedTokens.delete(token), 5 * 60 * 1000);

    res.json(successResponse(responseData, "Authentication successful"));
  } catch (error) {
    console.error("Error in verifyMagicLink:", {
      error: error,
      stack: error.stack,
      token: token,
    });
    next(error);
  }
};

// Refresh Token
const refreshToken = async (req, res, next) => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      throw new AppError(
        "Refresh token is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const result = await pool.query(
      `
      SELECT * FROM refresh_tokens 
      WHERE token = $1 AND expires_at > NOW()
    `,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      throw new AppError(
        "Invalid or expired refresh token",
        ServiceErrorTypes.AUTH_ERROR,
        401
      );
    }

    const token = result.rows[0];

    // Generate new access token
    const accessToken = jwt.sign({ id: token.user_id }, authConfig.jwt.secret, {
      expiresIn: authConfig.jwt.expiresIn,
    });

    res.json(successResponse({ accessToken }));
  } catch (error) {
    next(error);
  }
};

// Logout
const logout = async (req, res, next) => {
  const { refreshToken } = req.body;

  try {
    // Delete refresh token
    if (refreshToken) {
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [
        refreshToken,
      ]);
    }

    // Clear session
    req.session.destroy();

    res.json(successResponse({ message: "Logged out successfully" }));
  } catch (error) {
    next(error);
  }
};

// Get Current User
const getCurrentUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.organization_id,
        u.auth_type,
        u.last_login,
        o.name as organization_name,
        array_agg(DISTINCT t.id) as team_ids,
        array_agg(DISTINCT t.name) as team_names
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN team_members tm ON u.id = tm.user_id
      LEFT JOIN teams t ON tm.team_id = t.id
      WHERE u.id = $1
      GROUP BY u.id, o.name
    `,
      [req.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError("User not found", ServiceErrorTypes.NOT_FOUND, 404);
    }

    res.json(successResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMagicLink,
  verifyMagicLink,
  refreshToken,
  logout,
  getCurrentUser,
};
