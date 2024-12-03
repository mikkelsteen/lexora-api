const { Pool } = require("pg");

// Database connection setup
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "lexora",
  password: "",
  port: 5432,
});

async function fixTopics() {
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query("BEGIN");

    // Step 1: Fetch the IDs of incorrect topics
    const { rows: topicIds } = await client.query(
      `SELECT id FROM topics WHERE name IN ($1, $2, $3, $4)`,
      ["Manufacturing", "and Controls (CMC)", "Errors", "Problems"]
    );
    const topicIdList = topicIds.map((row) => row.id);

    if (topicIdList.length > 0) {
      console.log("Incorrect topic IDs to delete:", topicIdList);

      // Step 2: Remove relationships in the standards_topics table
      const deleteRelationships = `
        DELETE FROM standards_topics
        WHERE topic_id = ANY($1::uuid[]);
      `;
      await client.query(deleteRelationships, [topicIdList]);
      console.log(
        "Deleted relationships in standards_topics for incorrect topics."
      );

      // Step 3: Remove the incorrect topics from the topics table
      const deleteTopics = `
        DELETE FROM topics
        WHERE id = ANY($1::uuid[]);
      `;
      await client.query(deleteTopics, [topicIdList]);
      console.log("Deleted incorrect topics.");
    } else {
      console.log("No incorrect topics found.");
    }

    // Step 4: Update the incorrect topic "Chemistry" to the full title
    const updateChemistry = `
      UPDATE topics
      SET name = $1
      WHERE name = $2
    `;
    await client.query(updateChemistry, [
      "Chemistry, Manufacturing, and Controls (CMC)",
      "Chemistry",
    ]);
    console.log('Updated "Chemistry" to full title.');

    // Step 5: Update the incorrect topic "Safety - Issues" to the full title
    const updateSafety = `
      UPDATE topics
      SET name = $1
      WHERE name = $2
    `;
    await client.query(updateSafety, [
      "Safety - Issues, Errors, and Problems",
      "Safety - Issues",
    ]);
    console.log('Updated "Safety - Issues" to full title.');

    // Commit the transaction
    await client.query("COMMIT");
    console.log("Database fixes applied successfully!");
  } catch (error) {
    // Rollback the transaction in case of an error
    await client.query("ROLLBACK");
    console.error("Error applying database fixes:", error);
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Execute the script
fixTopics()
  .then(() => console.log("Script executed successfully"))
  .catch((err) => console.error("Script execution failed:", err));
