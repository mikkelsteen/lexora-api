const pool = require("../../db");

// Get standards
const getStandards = async (req, res) => {
  try {
    const {
      organization_id,
      topic_id,
      search,
      page = 1,
      limit = 24,
      sort_by = "issue_date", // Default to sorting by issue_date
      sort_order = "desc", // Default to descending order
    } = req.query;

    const conditions = [];
    if (organization_id) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM standards_organizations so 
          WHERE so.standard_id = standards.id 
          AND so.organization_id = '${organization_id}'
        )`
      );
    }
    if (topic_id) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM standards_topics st 
          WHERE st.standard_id = standards.id 
          AND st.topic_id = '${topic_id}'
        )`
      );
    }
    if (search) {
      conditions.push(
        `LOWER(standards.title) LIKE '%${search.toLowerCase()}%'`
      );
    }

    // Validate sort_by and sort_order to avoid SQL injection
    const validSortColumns = ["issue_date", "title"];
    const validSortOrders = ["asc", "desc"];
    const sortColumn = validSortColumns.includes(sort_by)
      ? sort_by
      : "issue_date";
    const sortDirection = validSortOrders.includes(sort_order.toLowerCase())
      ? sort_order.toUpperCase()
      : "DESC";

    // Fetch Standards with Related Data
    const query = `
      WITH filtered_standards AS (
        SELECT id, title, issue_date
        FROM standards
        ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
      )
      SELECT 
        fs.id,
        fs.title,
        fs.issue_date,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', fda_organization.id, 'name', fda_organization.name))
          FILTER (WHERE fda_organization.id IS NOT NULL), '[]'
        ) AS organizations,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', topics.id, 'name', topics.name))
          FILTER (WHERE topics.id IS NOT NULL), '[]'
        ) AS topics
      FROM filtered_standards fs
      LEFT JOIN standards_organizations 
        ON fs.id = standards_organizations.standard_id
      LEFT JOIN fda_organization 
        ON standards_organizations.organization_id = fda_organization.id
      LEFT JOIN standards_topics 
        ON fs.id = standards_topics.standard_id
      LEFT JOIN topics 
        ON standards_topics.topic_id = topics.id
      GROUP BY fs.id, fs.title, fs.issue_date
      ORDER BY fs.${sortColumn} ${sortDirection} NULLS LAST
      LIMIT ${limit} OFFSET ${(page - 1) * limit};
    `;

    const standards = await pool.query(query);

    // Fetch Total Count
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM standards
      ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
    `;

    const totalItemsResult = await pool.query(countQuery);
    const totalItems = totalItemsResult.rows[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limit);

    // Format Response
    res.json({
      data: standards.rows.map((standard) => ({
        ...standard,
        issue_date: standard.issue_date
          ? new Date(standard.issue_date).toISOString().split("T")[0]
          : null,
      })),
      metadata: {
        totalItems,
        totalPages,
        currentPage: parseInt(page, 10),
      },
    });
  } catch (error) {
    console.error("Error fetching standards:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Create a new standard
const createStandard = async (req, res) => {
  const {
    title,
    page_link,
    pdf_link,
    issue_date,
    closing_comment,
    status,
    docket_number,
    comment,
    file_name,
    downloaded,
  } = req.body;
  try {
    const newStandard = await pool.query(
      `INSERT INTO standards 
      (title, page_link, pdf_link, issue_date, closing_comment, status, docket_number, comment, file_name, downloaded) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        title,
        page_link,
        pdf_link,
        issue_date,
        closing_comment,
        status,
        docket_number,
        comment,
        file_name,
        downloaded,
      ]
    );
    res.status(201).json(newStandard.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Get a standard by ID
const getStandardById = async (req, res) => {
  const { id } = req.params;
  try {
    const standard = await pool.query("SELECT * FROM standards WHERE id = $1", [
      id,
    ]);
    if (standard.rows.length === 0) {
      return res.status(404).json({ msg: "Standard not found" });
    }
    res.json(standard.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Update a standard
const updateStandard = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    page_link,
    pdf_link,
    issue_date,
    closing_comment,
    status,
    docket_number,
    comment,
    file_name,
    downloaded,
  } = req.body;
  try {
    const updatedStandard = await pool.query(
      `UPDATE standards 
      SET title = $1, page_link = $2, pdf_link = $3, issue_date = $4, closing_comment = $5, status = $6, docket_number = $7, 
      comment = $8, file_name = $9, downloaded = $10 
      WHERE id = $11 RETURNING *`,
      [
        title,
        page_link,
        pdf_link,
        issue_date,
        closing_comment,
        status,
        docket_number,
        comment,
        file_name,
        downloaded,
        id,
      ]
    );
    if (updatedStandard.rows.length === 0) {
      return res.status(404).json({ msg: "Standard not found" });
    }
    res.json(updatedStandard.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Delete a standard
const deleteStandard = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedStandard = await pool.query(
      "DELETE FROM standards WHERE id = $1 RETURNING *",
      [id]
    );
    if (deletedStandard.rows.length === 0) {
      return res.status(404).json({ msg: "Standard not found" });
    }
    res.json({
      msg: "Standard deleted",
      deletedStandard: deletedStandard.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getStandards,
  createStandard,
  getStandardById,
  updateStandard,
  deleteStandard,
};
