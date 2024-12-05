const pool = require("../../db");
const {
  successResponse,
  AppError,
  ServiceErrorTypes,
} = require("../../utils/response.handler");

// Get standards
const getStandards = async (req, res, next) => {
  try {
    const {
      organization_id,
      topic_id,
      search,
      page = 1,
      limit = 24,
      sort_by = "issue_date",
      sort_order = "desc",
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      throw new AppError(
        "Invalid page number",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }
    if (isNaN(limitNum) || limitNum < 1) {
      throw new AppError(
        "Invalid limit number",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (organization_id) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM standards_organizations so 
          WHERE so.standard_id = standards.id 
          AND so.organization_id = $${paramCount}
        )`
      );
      params.push(organization_id);
      paramCount++;
    }
    if (topic_id) {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM standards_topics st 
          WHERE st.standard_id = standards.id 
          AND st.topic_id = $${paramCount}
        )`
      );
      params.push(topic_id);
      paramCount++;
    }
    if (search) {
      conditions.push(`LOWER(standards.title) LIKE $${paramCount}`);
      params.push(`%${search.toLowerCase()}%`);
      paramCount++;
    }

    // Validate sort parameters
    const validSortColumns = ["issue_date", "title"];
    const validSortOrders = ["asc", "desc"];
    if (!validSortColumns.includes(sort_by)) {
      throw new AppError(
        "Invalid sort column",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }
    if (!validSortOrders.includes(sort_order.toLowerCase())) {
      throw new AppError(
        "Invalid sort order",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

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
      ORDER BY fs.${sort_by} ${sort_order.toUpperCase()} NULLS LAST
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const standards = await pool.query(query, [
      ...params,
      limitNum,
      (pageNum - 1) * limitNum,
    ]);

    // Fetch Total Count
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM standards
      ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
    `;

    const totalItemsResult = await pool.query(countQuery, params);
    const totalItems = parseInt(totalItemsResult.rows[0]?.total || 0);
    const totalPages = Math.ceil(totalItems / limitNum);

    // Format and send response
    res.json(
      successResponse({
        standards: standards.rows.map((standard) => ({
          ...standard,
          issue_date: standard.issue_date
            ? new Date(standard.issue_date).toISOString().split("T")[0]
            : null,
        })),
        metadata: {
          totalItems,
          totalPages,
          currentPage: pageNum,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

// Create a new standard
const createStandard = async (req, res, next) => {
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
    if (!title) {
      throw new AppError(
        "Title is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

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

    res
      .status(201)
      .json(
        successResponse(newStandard.rows[0], "Standard created successfully")
      );
  } catch (error) {
    next(error);
  }
};

// Get a standard by ID
const getStandardById = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!id) {
      throw new AppError(
        "Standard ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const standard = await pool.query(
      `SELECT 
        s.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', fda_organization.id, 'name', fda_organization.name))
          FILTER (WHERE fda_organization.id IS NOT NULL), '[]'
        ) AS organizations,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', topics.id, 'name', topics.name))
          FILTER (WHERE topics.id IS NOT NULL), '[]'
        ) AS topics
      FROM standards s
      LEFT JOIN standards_organizations 
        ON s.id = standards_organizations.standard_id
      LEFT JOIN fda_organization 
        ON standards_organizations.organization_id = fda_organization.id
      LEFT JOIN standards_topics 
        ON s.id = standards_topics.standard_id
      LEFT JOIN topics 
        ON standards_topics.topic_id = topics.id
      WHERE s.id = $1
      GROUP BY s.id`,
      [id]
    );

    if (standard.rows.length === 0) {
      throw new AppError(
        "Standard not found",
        ServiceErrorTypes.NOT_FOUND,
        404
      );
    }

    res.json(successResponse(standard.rows[0]));
  } catch (error) {
    next(error);
  }
};

// Update a standard
const updateStandard = async (req, res, next) => {
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
    if (!id) {
      throw new AppError(
        "Standard ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }
    if (!title) {
      throw new AppError(
        "Title is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

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
      throw new AppError(
        "Standard not found",
        ServiceErrorTypes.NOT_FOUND,
        404
      );
    }

    res.json(
      successResponse(updatedStandard.rows[0], "Standard updated successfully")
    );
  } catch (error) {
    next(error);
  }
};

// Delete a standard
const deleteStandard = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!id) {
      throw new AppError(
        "Standard ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const deletedStandard = await pool.query(
      "DELETE FROM standards WHERE id = $1 RETURNING *",
      [id]
    );

    if (deletedStandard.rows.length === 0) {
      throw new AppError(
        "Standard not found",
        ServiceErrorTypes.NOT_FOUND,
        404
      );
    }

    res.json(
      successResponse(
        { deletedStandard: deletedStandard.rows[0] },
        "Standard deleted successfully"
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStandards,
  createStandard,
  getStandardById,
  updateStandard,
  deleteStandard,
};
