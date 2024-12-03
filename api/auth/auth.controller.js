const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const pool = require("../../db");
const authConfig = require("../../config/auth.config");

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
const sendMagicLink = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    let result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    let user;

    if (result.rows.length === 0) {
      // Create new user
      result = await pool.query(
        "INSERT INTO users (email, auth_type) VALUES ($1, $2) RETURNING *",
        [email, "magic-link"]
      );
    }
    user = result.rows[0];

    // Generate magic link token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // 15 minutes

    await pool.query(
      "INSERT INTO magic_link_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expires]
    );

    // Send magic link email
    const magicLink = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/verify-magic-link?token=${token}`;

    await transporter.sendMail({
      from: authConfig.email.from,
      to: email,
      subject: "Your Magic Link",
      html: `
        <p>Click the link below to sign in:</p>
        <a href="${magicLink}">Sign In</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    });

    res.json({ message: "Magic link sent successfully" });
  } catch (error) {
    console.error("Magic link error:", error);
    res.status(500).json({ message: "Error sending magic link" });
  }
};

// Verify Magic Link
const verifyMagicLink = async (req, res) => {
  const { token } = req.query;

  try {
    const result = await pool.query(
      `
      SELECT t.*, u.id as user_id 
      FROM magic_link_tokens t
      INNER JOIN users u ON t.user_id = u.id
      WHERE t.token = $1 AND t.expires_at > NOW()
    `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = result.rows[0];

    // Delete used token
    await pool.query("DELETE FROM magic_link_tokens WHERE token = $1", [token]);

    // Generate JWT tokens
    const tokens = await generateTokens(user.user_id);

    // Update last login
    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.user_id]
    );

    // Set session
    req.session.userId = user.user_id;

    res.json({
      message: "Authentication successful",
      ...tokens,
      user: {
        id: user.user_id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Magic link verification error:", error);
    res.status(500).json({ message: "Error verifying magic link" });
  }
};

// Refresh Token
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const result = await pool.query(
      `
      SELECT * FROM refresh_tokens 
      WHERE token = $1 AND expires_at > NOW()
    `,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    const token = result.rows[0];

    // Generate new access token
    const accessToken = jwt.sign({ id: token.user_id }, authConfig.jwt.secret, {
      expiresIn: authConfig.jwt.expiresIn,
    });

    res.json({ accessToken });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ message: "Error refreshing token" });
  }
};

// Logout
const logout = async (req, res) => {
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

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Error during logout" });
  }
};

// Get Current User
const getCurrentUser = async (req, res) => {
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
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Error fetching user data" });
  }
};

module.exports = {
  sendMagicLink,
  verifyMagicLink,
  refreshToken,
  logout,
  getCurrentUser,
};
