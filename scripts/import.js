const fs = require("fs");
const csv = require("csv-parser");
const { Client } = require("pg");
const cliProgress = require("cli-progress");

// PostgreSQL Configuration
const dbConfig = {
  user: "postgres",
  host: "localhost",
  database: "lexora",
  password: "",
  port: 5432,
};

// Connect to PostgreSQL
const pgClient = new Client(dbConfig);
pgClient.connect();

// Helper Functions
const upsertOrganization = async (name) => {
  const res = await pgClient.query(
    "INSERT INTO fda_organization (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id",
    [name]
  );
  return (
    res.rows[0]?.id ||
    (
      await pgClient.query("SELECT id FROM fda_organization WHERE name = $1", [
        name,
      ])
    ).rows[0]?.id
  );
};

const upsertTopic = async (name) => {
  const res = await pgClient.query(
    "INSERT INTO topics (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id",
    [name]
  );
  return (
    res.rows[0]?.id ||
    (await pgClient.query("SELECT id FROM topics WHERE name = $1", [name]))
      .rows[0]?.id
  );
};

const parseJSONField = (field) => {
  try {
    if (!field || field.trim() === "") return [];
    return JSON.parse(field.replace(/'/g, '"'));
  } catch (err) {
    console.error(`Invalid JSON in field: ${field}`, err);
    return [];
  }
};

const normalizeDate = (date) => {
  return date && date.trim() ? date : null;
};

// Import CSV and Insert Data
const importCSV = async (csvPath) => {
  const rows = [];

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      console.log(`Found ${rows.length} entries. Starting import...`);

      const progressBar = new cliProgress.SingleBar(
        {},
        cliProgress.Presets.shades_classic
      );
      progressBar.start(rows.length, 0);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const {
            title,
            page_link,
            pdf_link,
            issue_date,
            closing_comment,
            status,
            docket_number,
            comment,
            fda_organization,
            topic,
          } = row;

          const organizations = parseJSONField(fda_organization);
          const topics = parseJSONField(topic);

          // Insert the standard
          const res = await pgClient.query(
            `INSERT INTO standards 
            (title, page_link, pdf_link, issue_date, closing_comment, status, docket_number, comment)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [
              title,
              page_link,
              pdf_link,
              normalizeDate(issue_date),
              normalizeDate(closing_comment),
              status,
              docket_number,
              comment,
            ]
          );
          const standardId = res.rows[0].id;

          // Insert organizations
          for (const org of organizations) {
            const orgId = await upsertOrganization(org);
            await pgClient.query(
              "INSERT INTO standards_organizations (standard_id, organization_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [standardId, orgId]
            );
          }

          // Insert topics
          for (const top of topics) {
            const topicId = await upsertTopic(top);
            await pgClient.query(
              "INSERT INTO standards_topics (standard_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [standardId, topicId]
            );
          }

          progressBar.update(i + 1);
        } catch (err) {
          console.error(`Error processing row ${i + 1}:`, row, err);
        }
      }

      progressBar.stop();
      console.log(
        "CSV file successfully processed and imported into PostgreSQL."
      );
      pgClient.end();
    });
};

// Start the import
const csvFilePath = "/usr/local/var/www/lexora-api/assets/standards.csv";
importCSV(csvFilePath);
