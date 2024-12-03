const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config");
const pool = require("../db");

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers["x-access-token"] || req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  const tokenString = token.startsWith("Bearer ") ? token.slice(7) : token;

  try {
    const decoded = jwt.verify(tokenString, authConfig.jwt.secret);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Check if user belongs to organization
const verifyOrganizationMember = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT organization_id FROM users WHERE id = $1",
      [req.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].organization_id) {
      return res
        .status(403)
        .json({ message: "User does not belong to any organization" });
    }

    req.organizationId = result.rows[0].organization_id;
    next();
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error verifying organization membership" });
  }
};

// Check if user belongs to team
const verifyTeamMember = async (req, res, next) => {
  const teamId = req.params.teamId || req.body.teamId;

  if (!teamId) {
    return res.status(400).json({ message: "Team ID is required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2",
      [teamId, req.userId]
    );

    if (result.rows.length === 0) {
      return res
        .status(403)
        .json({ message: "User is not a member of this team" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Error verifying team membership" });
  }
};

// Check if organization has valid license
const verifyLicense = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT l.* FROM licenses l
      INNER JOIN users u ON u.organization_id = l.organization_id
      WHERE u.id = $1 AND l.valid_until > NOW()
      ORDER BY l.valid_until DESC
      LIMIT 1
    `,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: "No valid license found" });
    }

    // Check if organization has exceeded seats limit
    const usersCount = await pool.query(
      "SELECT COUNT(*) FROM users WHERE organization_id = $1",
      [req.organizationId]
    );

    if (parseInt(usersCount.rows[0].count) > result.rows[0].seats_limit) {
      return res
        .status(403)
        .json({ message: "Organization has exceeded seats limit" });
    }

    req.license = result.rows[0];
    next();
  } catch (error) {
    return res.status(500).json({ message: "Error verifying license" });
  }
};

// Verify session middleware
const verifySession = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "No valid session found" });
  }
  req.userId = req.session.userId;
  next();
};

module.exports = {
  verifyToken,
  verifyOrganizationMember,
  verifyTeamMember,
  verifyLicense,
  verifySession,
};
