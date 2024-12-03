const pool = require("../../db");
const bcrypt = require("bcrypt");

/**
 * @desc    Create a new user
 * @route   POST /api/users
 * @access  Admin
 */
const createUser = async (req, res) => {
  const { email, firstName, lastName, password, organizationId } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if user exists
    const existingUser = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // If password provided, hash it
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Create user
    const result = await client.query(
      `
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        organization_id,
        auth_type
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, organization_id, auth_type, created_at
    `,
      [
        email,
        passwordHash,
        firstName,
        lastName,
        organizationId,
        password ? "local" : "magic-link",
      ]
    );

    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create user error:", error);
    res.status(500).json({ message: "Error creating user" });
  } finally {
    client.release();
  }
};

/**
 * @desc    Get all users (with pagination and filters)
 * @route   GET /api/users
 * @access  Admin
 */
const getUsers = async (req, res) => {
  const { page = 1, limit = 10, search, organizationId } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.organization_id,
        u.auth_type,
        u.is_active,
        u.last_login,
        u.created_at,
        o.name as organization_name,
        COUNT(*) OVER() as total_count
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (
        u.email ILIKE $${paramCount} OR
        u.first_name ILIKE $${paramCount} OR
        u.last_name ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (organizationId) {
      query += ` AND u.organization_id = $${paramCount}`;
      queryParams.push(organizationId);
      paramCount++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${
      paramCount + 1
    }`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    res.json({
      users: result.rows,
      pagination: {
        total: parseInt(result.rows[0]?.total_count || 0),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Admin or Self
 */
const getUserById = async (req, res) => {
  const { id } = req.params;

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
        u.is_active,
        u.last_login,
        u.created_at,
        o.name as organization_name,
        array_agg(DISTINCT t.name) as teams
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN team_members tm ON u.id = tm.user_id
      LEFT JOIN teams t ON tm.team_id = t.id
      WHERE u.id = $1
      GROUP BY u.id, o.name
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Admin or Self
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, firstName, lastName, password, isActive, organizationId } =
    req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // If email is being updated, check for duplicates
    if (email) {
      const existingUser = await client.query(
        "SELECT * FROM users WHERE email = $1 AND id != $2",
        [email, id]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    let updateQuery = `
      UPDATE users 
      SET 
        updated_at = CURRENT_TIMESTAMP
    `;
    const queryParams = [];
    let paramCount = 1;

    if (email) {
      updateQuery += `, email = $${paramCount}`;
      queryParams.push(email);
      paramCount++;
    }

    if (firstName) {
      updateQuery += `, first_name = $${paramCount}`;
      queryParams.push(firstName);
      paramCount++;
    }

    if (lastName) {
      updateQuery += `, last_name = $${paramCount}`;
      queryParams.push(lastName);
      paramCount++;
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updateQuery += `, password_hash = $${paramCount}`;
      queryParams.push(passwordHash);
      paramCount++;
    }

    if (isActive !== undefined) {
      updateQuery += `, is_active = $${paramCount}`;
      queryParams.push(isActive);
      paramCount++;
    }

    if (organizationId) {
      updateQuery += `, organization_id = $${paramCount}`;
      queryParams.push(organizationId);
      paramCount++;
    }

    queryParams.push(id);
    updateQuery += ` WHERE id = $${paramCount} RETURNING *`;

    const result = await client.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update user error:", error);
    res.status(500).json({ message: "Error updating user" });
  } finally {
    client.release();
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Admin
 */
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Delete user's team memberships
    await client.query("DELETE FROM team_members WHERE user_id = $1", [id]);

    // Delete user's tokens
    await client.query("DELETE FROM magic_link_tokens WHERE user_id = $1", [
      id,
    ]);
    await client.query("DELETE FROM refresh_tokens WHERE user_id = $1", [id]);

    // Delete user
    const result = await client.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await client.query("COMMIT");
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Error deleting user" });
  } finally {
    client.release();
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
