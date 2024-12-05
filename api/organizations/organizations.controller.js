const pool = require("../../db");
const {
  successResponse,
  AppError,
  ServiceErrorTypes,
} = require("../../utils/response.handler");

// Create organization
const createOrganization = async (req, res, next) => {
  const { name } = req.body;
  const client = await pool.connect();

  try {
    if (!name) {
      throw new AppError(
        "Organization name is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

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
    res.json(
      successResponse(orgResult.rows[0], "Organization created successfully")
    );
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      next(
        new AppError(
          "Organization with this name already exists",
          ServiceErrorTypes.VALIDATION_ERROR,
          400
        )
      );
    } else {
      next(error);
    }
  } finally {
    client.release();
  }
};

// Get organization details
const getOrganization = async (req, res, next) => {
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
      throw new AppError(
        "Organization not found",
        ServiceErrorTypes.NOT_FOUND,
        404
      );
    }

    res.json(successResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
};

// Update organization
const updateOrganization = async (req, res, next) => {
  const { name } = req.body;

  try {
    if (!name) {
      throw new AppError(
        "Organization name is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const result = await pool.query(
      "UPDATE organizations SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [name, req.organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError(
        "Organization not found",
        ServiceErrorTypes.NOT_FOUND,
        404
      );
    }

    res.json(
      successResponse(result.rows[0], "Organization updated successfully")
    );
  } catch (error) {
    if (error.code === "23505") {
      next(
        new AppError(
          "Organization with this name already exists",
          ServiceErrorTypes.VALIDATION_ERROR,
          400
        )
      );
    } else {
      next(error);
    }
  }
};

// Get organization members
const getMembers = async (req, res, next) => {
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

    res.json(successResponse(result.rows));
  } catch (error) {
    next(error);
  }
};

// Create team
const createTeam = async (req, res, next) => {
  const { name } = req.body;

  try {
    if (!name) {
      throw new AppError(
        "Team name is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const result = await pool.query(
      "INSERT INTO teams (organization_id, name) VALUES ($1, $2) RETURNING *",
      [req.organizationId, name]
    );

    res.json(successResponse(result.rows[0], "Team created successfully"));
  } catch (error) {
    if (error.code === "23505") {
      next(
        new AppError(
          "Team with this name already exists",
          ServiceErrorTypes.VALIDATION_ERROR,
          400
        )
      );
    } else {
      next(error);
    }
  }
};

// Update team
const updateTeam = async (req, res, next) => {
  const { teamId } = req.params;
  const { name } = req.body;

  try {
    if (!teamId) {
      throw new AppError(
        "Team ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }
    if (!name) {
      throw new AppError(
        "Team name is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const result = await pool.query(
      "UPDATE teams SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3 RETURNING *",
      [name, teamId, req.organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError("Team not found", ServiceErrorTypes.NOT_FOUND, 404);
    }

    res.json(successResponse(result.rows[0], "Team updated successfully"));
  } catch (error) {
    if (error.code === "23505") {
      next(
        new AppError(
          "Team with this name already exists",
          ServiceErrorTypes.VALIDATION_ERROR,
          400
        )
      );
    } else {
      next(error);
    }
  }
};

// Delete team
const deleteTeam = async (req, res, next) => {
  const { teamId } = req.params;

  try {
    if (!teamId) {
      throw new AppError(
        "Team ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const result = await pool.query(
      "DELETE FROM teams WHERE id = $1 AND organization_id = $2 RETURNING *",
      [teamId, req.organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError("Team not found", ServiceErrorTypes.NOT_FOUND, 404);
    }

    res.json(successResponse(null, "Team deleted successfully"));
  } catch (error) {
    if (error.code === "23503") {
      next(
        new AppError(
          "Cannot delete team that has members",
          ServiceErrorTypes.VALIDATION_ERROR,
          400
        )
      );
    } else {
      next(error);
    }
  }
};

// Manage team members
const manageTeamMembers = async (req, res, next) => {
  const { teamId } = req.params;
  const { userIds } = req.body;
  const client = await pool.connect();

  try {
    if (!teamId) {
      throw new AppError(
        "Team ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }
    if (!Array.isArray(userIds)) {
      throw new AppError(
        "User IDs must be an array",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    await client.query("BEGIN");

    // Verify team exists and belongs to organization
    const teamResult = await client.query(
      "SELECT id FROM teams WHERE id = $1 AND organization_id = $2",
      [teamId, req.organizationId]
    );

    if (teamResult.rows.length === 0) {
      throw new AppError("Team not found", ServiceErrorTypes.NOT_FOUND, 404);
    }

    // Remove existing members
    await client.query("DELETE FROM team_members WHERE team_id = $1", [teamId]);

    // Add new members
    if (userIds.length > 0) {
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
    res.json(successResponse(null, "Team members updated successfully"));
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
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
