const pool = require("../../db");

// Get all FDA organizations
const getAllFDAOrganizations = async (req, res) => {
  try {
    const organizations = await pool.query(
      "SELECT * FROM fda_organization ORDER BY name asc NULLS LAST"
    );
    res.json(organizations.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Create a new FDA organization
const createFDAOrganization = async (req, res) => {
  const { name } = req.body;
  try {
    const newOrganization = await pool.query(
      "INSERT INTO fda_organization (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.status(201).json(newOrganization.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Get an FDA organization by ID
const getFDAOrganizationById = async (req, res) => {
  const { id } = req.params;
  try {
    const organization = await pool.query(
      "SELECT * FROM fda_organization WHERE id = $1",
      [id]
    );
    if (organization.rows.length === 0) {
      return res.status(404).json({ msg: "FDA Organization not found" });
    }
    res.json(organization.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Update an FDA organization
const updateFDAOrganization = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const updatedOrganization = await pool.query(
      "UPDATE fda_organization SET name = $1 WHERE id = $2 RETURNING *",
      [name, id]
    );
    if (updatedOrganization.rows.length === 0) {
      return res.status(404).json({ msg: "FDA Organization not found" });
    }
    res.json(updatedOrganization.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Delete an FDA organization
const deleteFDAOrganization = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedOrganization = await pool.query(
      "DELETE FROM fda_organization WHERE id = $1 RETURNING *",
      [id]
    );
    if (deletedOrganization.rows.length === 0) {
      return res.status(404).json({ msg: "FDA Organization not found" });
    }
    res.json({
      msg: "FDA Organization deleted",
      deletedOrganization: deletedOrganization.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getAllFDAOrganizations,
  createFDAOrganization,
  getFDAOrganizationById,
  updateFDAOrganization,
  deleteFDAOrganization,
};
