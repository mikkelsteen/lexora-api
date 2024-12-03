const pool = require("../../db");

// Get all topics
const getAllTopics = async (req, res) => {
  try {
    const topics = await pool.query(
      "SELECT * FROM topics ORDER BY name asc NULLS LAST"
    );
    res.json(topics.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Create a new topic
const createTopic = async (req, res) => {
  const { name } = req.body;
  try {
    const newTopic = await pool.query(
      "INSERT INTO topics (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.status(201).json(newTopic.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Get a topic by ID
const getTopicById = async (req, res) => {
  const { id } = req.params;
  try {
    const topic = await pool.query("SELECT * FROM topics WHERE id = $1", [id]);
    if (topic.rows.length === 0) {
      return res.status(404).json({ msg: "Topic not found" });
    }
    res.json(topic.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Update a topic
const updateTopic = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const updatedTopic = await pool.query(
      "UPDATE topics SET name = $1 WHERE id = $2 RETURNING *",
      [name, id]
    );
    if (updatedTopic.rows.length === 0) {
      return res.status(404).json({ msg: "Topic not found" });
    }
    res.json(updatedTopic.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Delete a topic
const deleteTopic = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedTopic = await pool.query(
      "DELETE FROM topics WHERE id = $1 RETURNING *",
      [id]
    );
    if (deletedTopic.rows.length === 0) {
      return res.status(404).json({ msg: "Topic not found" });
    }
    res.json({ msg: "Topic deleted", deletedTopic: deletedTopic.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getAllTopics,
  createTopic,
  getTopicById,
  updateTopic,
  deleteTopic,
};
