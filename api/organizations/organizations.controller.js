const pool = require("../../db");

// Create organization
const createOrganization = async (req, res) => {
  const { name } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create organization
    const orgResult = await client.query(
      "INSERT INTO organizations (name) VALUES ($1) RETURNING *",
      [name]
    );

    // Update user's organization
    await client.query("UPDATE users SET organization_id = $1 WHERE id = $2", [
      orgResult.rows[0].id,
      req.userId,
    ]);

    await client.query("COMMIT");
    res.json(orgResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create organization error:", error);
    res.status(500).json({ message: "Error creating organization" });
  } finally {
    client.release();
  }
};

// Get organization details
const getOrganization = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        o.*,
        l.seats_limit,
        l.valid_until,
        (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as current_seats,
        (
          SELECT json_agg(json_build_object(
            'id', t.id,
            'name', t.name,
            'member_count', (
              SELECT COUNT(*) FROM team_members WHERE team_id = t.id
            )
          ))
          FROM teams t
          WHERE t.organization_id = o.id
        ) as teams
      FROM organizations o
      LEFT JOIN licenses l ON l.organization_id = o.id
      WHERE o.id = $1
    `,
      [req.organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get organization error:", error);
    res.status(500).json({ message: "Error fetching organization" });
  }
};

// Update organization
const updateOrganization = async (req, res) => {
  const { name } = req.body;

  try {
    const result = await pool.query(
      "UPDATE organizations SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [name, req.organizationId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update organization error:", error);
    res.status(500).json({ message: "Error updating organization" });
  }
};

// Get organization members
const getMembers = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.last_login,
        array_agg(DISTINCT t.name) as teams
      FROM users u
      LEFT JOIN team_members tm ON u.id = tm.user_id
      LEFT JOIN teams t ON tm.team_id = t.id
      WHERE u.organization_id = $1
      GROUP BY u.id
    `,
      [req.organizationId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({ message: "Error fetching members" });
  }
};

// Create team
const createTeam = async (req, res) => {
  const { name } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO teams (organization_id, name) VALUES ($1, $2) RETURNING *",
      [req.organizationId, name]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Create team error:", error);
    res.status(500).json({ message: "Error creating team" });
  }
};

// Update team
const updateTeam = async (req, res) => {
  const { teamId } = req.params;
  const { name } = req.body;

  try {
    const result = await pool.query(
      "UPDATE teams SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3 RETURNING *",
      [name, teamId, req.organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update team error:", error);
    res.status(500).json({ message: "Error updating team" });
  }
};

// Delete team
const deleteTeam = async (req, res) => {
  const { teamId } = req.params;

  try {
    await pool.query(
      "DELETE FROM teams WHERE id = $1 AND organization_id = $2",
      [teamId, req.organizationId]
    );

    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Delete team error:", error);
    res.status(500).json({ message: "Error deleting team" });
  }
};

// Manage team members
const manageTeamMembers = async (req, res) => {
  const { teamId } = req.params;
  const { userIds } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Remove existing members
    await client.query("DELETE FROM team_members WHERE team_id = $1", [teamId]);

    // Add new members
    if (userIds && userIds.length > 0) {
      const values = userIds.map((userId) => `($1, '${userId}')`).join(",");
      await client.query(
        `
        INSERT INTO team_members (team_id, user_id)
        VALUES ${values}
      `,
        [teamId]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Team members updated successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Manage team members error:", error);
    res.status(500).json({ message: "Error managing team members" });
  } finally {
    client.release();
  }
};

module.exports = {
  createOrganization,
  getOrganization,
  updateOrganization,
  getMembers,
  createTeam,
  updateTeam,
  deleteTeam,
  manageTeamMembers,
};
