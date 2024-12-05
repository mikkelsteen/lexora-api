const pool = require("../../db");
const {
  successResponse,
  AppError,
  ServiceErrorTypes,
} = require("../../utils/response.handler");

// Get all topics
const getAllTopics = async (req, res, next) => {
  try {
    const topics = await pool.query(
      "SELECT * FROM topics ORDER BY name asc NULLS LAST"
    );
    res.json(successResponse(topics.rows));
  } catch (error) {
    next(error);
  }
};

// Create a new topic
const createTopic = async (req, res, next) => {
  const { name } = req.body;

  try {
    if (!name) {
      throw new AppError(
        "Topic name is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const newTopic = await pool.query(
      "INSERT INTO topics (name) VALUES ($1) RETURNING *",
      [name]
    );

    res
      .status(201)
      .json(successResponse(newTopic.rows[0], "Topic created successfully"));
  } catch (error) {
    // Check for unique constraint violation
    if (error.code === "23505") {
      // PostgreSQL unique violation code
      next(
        new AppError(
          "Topic with this name already exists",
          ServiceErrorTypes.VALIDATION_ERROR,
          400
        )
      );
    } else {
      next(error);
    }
  }
};

// Get a topic by ID
const getTopicById = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!id) {
      throw new AppError(
        "Topic ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const topic = await pool.query("SELECT * FROM topics WHERE id = $1", [id]);

    if (topic.rows.length === 0) {
      throw new AppError("Topic not found", ServiceErrorTypes.NOT_FOUND, 404);
    }

    res.json(successResponse(topic.rows[0]));
  } catch (error) {
    next(error);
  }
};

// Update a topic
const updateTopic = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    if (!id) {
      throw new AppError(
        "Topic ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    if (!name) {
      throw new AppError(
        "Topic name is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const updatedTopic = await pool.query(
      "UPDATE topics SET name = $1 WHERE id = $2 RETURNING *",
      [name, id]
    );

    if (updatedTopic.rows.length === 0) {
      throw new AppError("Topic not found", ServiceErrorTypes.NOT_FOUND, 404);
    }

    res.json(
      successResponse(updatedTopic.rows[0], "Topic updated successfully")
    );
  } catch (error) {
    // Check for unique constraint violation
    if (error.code === "23505") {
      next(
        new AppError(
          "Topic with this name already exists",
          ServiceErrorTypes.VALIDATION_ERROR,
          400
        )
      );
    } else {
      next(error);
    }
  }
};

// Delete a topic
const deleteTopic = async (req, res, next) => {
  const { id } = req.params;

  try {
    if (!id) {
      throw new AppError(
        "Topic ID is required",
        ServiceErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const deletedTopic = await pool.query(
      "DELETE FROM topics WHERE id = $1 RETURNING *",
      [id]
    );

    if (deletedTopic.rows.length === 0) {
      throw new AppError("Topic not found", ServiceErrorTypes.NOT_FOUND, 404);
    }

    res.json(
      successResponse(
        { deletedTopic: deletedTopic.rows[0] },
        "Topic deleted successfully"
      )
    );
  } catch (error) {
    // Check for foreign key violation
    if (error.code === "23503") {
      next(
        new AppError(
          "Cannot delete topic that is in use",
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
  getAllTopics,
  createTopic,
  getTopicById,
  updateTopic,
  deleteTopic,
};
