const fs = require("fs");
const https = require("https");
const path = require("path");
const { Client } = require("pg");

// PostgreSQL Configuration
const dbConfig = {
  user: "postgres",
  host: "localhost",
  database: "lexora",
  password: "",
  port: 5432,
};

// Directory to store downloaded files
const assetsDir = "/usr/local/var/www/lexora-api/assets/standards";
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Helper Functions
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

const sanitizeFileName = (name, id) => {
  const sanitized = name.replace(/[\/\\:*?"<>|]/g, "").replace(/\s+/g, "_");
  const maxLength = 150; // Limit the file name to 200 characters to account for the ".pdf" extension and directory path
  const truncated = sanitized.substring(0, maxLength);
  return `${truncated}_${id}.pdf`; // Append the record ID to ensure uniqueness
};

const downloadFile = async (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`Failed to download file: HTTP ${response.statusCode}`)
          );
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close(() => {
            if (fs.existsSync(dest)) {
              resolve();
            } else {
              reject(new Error(`File not saved correctly: ${dest}`));
            }
          });
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => reject(err)); // Delete file if an error occurs
      });
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Main Script
const downloadPDFs = async () => {
  const pgClient = new Client(dbConfig);
  await pgClient.connect();

  try {
    // Fetch records that haven't been downloaded yet
    const res = await pgClient.query(
      "SELECT id, pdf_link, title FROM standards WHERE downloaded = FALSE AND pdf_link IS NOT NULL"
    );

    const records = res.rows;

    console.log(`Found ${records.length} files to download.`);

    for (const record of records) {
      const { id, pdf_link, title } = record;

      // Validate the URL
      if (!isValidUrl(pdf_link)) {
        console.error(`Invalid URL for record ID ${id}: ${pdf_link}`);
        continue;
      }

      // Generate sanitized file name and determine the file path
      const sanitizedTitle = sanitizeFileName(title);
      const filePath = path.join(assetsDir, sanitizedTitle);

      try {
        // Download the file
        console.log(
          `Downloading ID ${id} (${sanitizedTitle}) from ${pdf_link}...`
        );
        await downloadFile(pdf_link, filePath);

        // Mark as downloaded and store the file name in the database
        await pgClient.query(
          "UPDATE standards SET downloaded = TRUE, file_name = $1 WHERE id = $2",
          [sanitizedTitle, id]
        );

        console.log(`Successfully downloaded and updated record ID ${id}.`);
      } catch (err) {
        console.error(`Failed to download record ID ${id}:`, err.message);
        continue; // Skip to the next record
      }

      // Wait 20-40 seconds before the next download
      const delay = Math.floor(Math.random() * 15000) + 5000;
      console.log(
        `Waiting ${delay / 1000} seconds before the next download...`
      );
      await wait(delay);
    }

    console.log("All files processed.");
  } catch (err) {
    console.error("Error during PDF download process:", err);
  } finally {
    await pgClient.end();
  }
};

downloadPDFs();
