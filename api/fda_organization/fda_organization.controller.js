const pool = require("../../db");
const {
  successResponse,
  AppError,
  ServiceErrorTypes,
} = require("../../utils/response.handler");

// Get all FDA organizations
const getAllFDAOrganizations = async (req, res, next) => {
  try {
    const organizations = await pool.query(
      "SELECT * FROM fda_organization ORDER BY name asc NULLS LAST"
    );
    res.json(successResponse(organizations.rows));
  } catch (error) {
    next(error);
  }
};

// Create a new FDA organization
const createFDAOrganization = async (req, res, next) => {
  const { name } = req.body;

  try {
    if (!name) {
      throw new AppError(
        "Organization name is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const newOrganization = await pool.query(
      "INSERT INTO fda_organization (name) VALUES ($1) RETURNING *",
      [name]
    );

    res
      .status(201)
      .json(
        successResponse(
          newOrganization.rows[0],
          "FDA Organization created successfully"
        )
      );
  } catch (error) {
    // Check for unique constraint violation
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

// Get an FDA organization by ID
const getFDAOrganizationById = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!id) {
      throw new AppError(
        "Organization ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const organization = await pool.query(
      "SELECT * FROM fda_organization WHERE id = $1",
      [id]
    );

    if (organization.rows.length === 0) {
      throw new AppError(
        "FDA Organization not found",
        ServiceErrorTypes.NOT_FOUND,
        404
      );
    }

    res.json(successResponse(organization.rows[0]));
  } catch (error) {
    next(error);
  }
};

// Update an FDA organization
const updateFDAOrganization = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    if (!id) {
      throw new AppError(
        "Organization ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    if (!name) {
      throw new AppError(
        "Organization name is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const updatedOrganization = await pool.query(
      "UPDATE fda_organization SET name = $1 WHERE id = $2 RETURNING *",
      [name, id]
    );

    if (updatedOrganization.rows.length === 0) {
      throw new AppError(
        "FDA Organization not found",
        ServiceErrorTypes.NOT_FOUND,
        404
      );
    }

    res.json(
      successResponse(
        updatedOrganization.rows[0],
        "FDA Organization updated successfully"
      )
    );
  } catch (error) {
    // Check for unique constraint violation
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

// Delete an FDA organization
const deleteFDAOrganization = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!id) {
      throw new AppError(
        "Organization ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const deletedOrganization = await pool.query(
      "DELETE FROM fda_organization WHERE id = $1 RETURNING *",
      [id]
    );

    if (deletedOrganization.rows.length === 0) {
      throw new AppError(
        "FDA Organization not found",
        ServiceErrorTypes.NOT_FOUND,
        404
      );
    }

    res.json(
      successResponse(
        { deletedOrganization: deletedOrganization.rows[0] },
        "FDA Organization deleted successfully"
      )
    );
  } catch (error) {
    // Check for foreign key violation
    if (error.code === "23503") {
      next(
        new AppError(
          "Cannot delete organization that is associated with standards",
          ServiceErrorTypes.VALIDATION_ERROR,
          400
        )
      );
    } else {
      next(error);
    }
  }
};

module.exports = {
  getAllFDAOrganizations,
  createFDAOrganization,
  getFDAOrganizationById,
  updateFDAOrganization,
  deleteFDAOrganization,
};
