const pool = require("../db");

const setup = async () => {
  try {
    // Create extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create session table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);

    // Create organizations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create licenses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        seats_limit INTEGER NOT NULL,
        valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create teams table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organization_id, name)
      )
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
        auth_type VARCHAR(50) NOT NULL DEFAULT 'magic-link',
        google_id VARCHAR(255),
        microsoft_id VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create team_members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (team_id, user_id)
      )
    `);

    // Create magic_link_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS magic_link_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create refresh_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"
    );
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)"
    );
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id)"
    );
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id)"
    );
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id)"
    );
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_licenses_organization ON licenses(organization_id)"
    );
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_user ON magic_link_tokens(user_id)"
    );
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)"
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")'
    );

    console.log("Database setup completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error setting up database:", error);
    process.exit(1);
  }
};

setup();
