const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const OIDCStrategy = require("passport-azure-ad").OIDCStrategy;
const pool = require("../db");
const authConfig = require("./auth.config");

// Construct base URL from environment variables
const BASE_URL = process.env.BASE_URL || "http://localhost:3002";

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: authConfig.google.clientID,
      clientSecret: authConfig.google.clientSecret,
      callbackURL: `${BASE_URL}${authConfig.google.callbackURL}`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let result = await pool.query(
          "SELECT * FROM users WHERE google_id = $1",
          [profile.id]
        );

        if (result.rows.length > 0) {
          // Update last login
          await pool.query(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
            [result.rows[0].id]
          );
          return done(null, result.rows[0]);
        }

        // Create new user
        result = await pool.query(
          `
        INSERT INTO users (
          email,
          first_name,
          last_name,
          google_id,
          auth_type,
          last_login
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `,
          [
            profile.emails[0].value,
            profile.name.givenName,
            profile.name.familyName,
            profile.id,
            "google",
          ]
        );

        done(null, result.rows[0]);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Microsoft Strategy
if (
  authConfig.microsoft.clientID &&
  authConfig.microsoft.clientSecret &&
  authConfig.microsoft.tenant
) {
  passport.use(
    "azure",
    new OIDCStrategy(
      {
        identityMetadata: `https://login.microsoftonline.com/${authConfig.microsoft.tenant}/v2.0/.well-known/openid-configuration`,
        clientID: authConfig.microsoft.clientID,
        clientSecret: authConfig.microsoft.clientSecret,
        responseType: "code id_token",
        responseMode: "form_post",
        redirectUrl: `${BASE_URL}${authConfig.microsoft.callbackURL}`,
        allowHttpForRedirectUrl: process.env.NODE_ENV !== "production",
        validateIssuer: true,
        issuer: `https://login.microsoftonline.com/${authConfig.microsoft.tenant}/v2.0`,
        passReqToCallback: false,
        scope: ["profile", "email", "openid"],
      },
      async (profile, done) => {
        try {
          // Check if user exists
          let result = await pool.query(
            "SELECT * FROM users WHERE microsoft_id = $1",
            [profile.oid]
          );

          if (result.rows.length > 0) {
            // Update last login
            await pool.query(
              "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
              [result.rows[0].id]
            );
            return done(null, result.rows[0]);
          }

          // Create new user
          result = await pool.query(
            `
          INSERT INTO users (
            email,
            first_name,
            last_name,
            microsoft_id,
            auth_type,
            last_login
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          RETURNING *
        `,
            [
              profile.upn || profile.emails[0],
              profile.name?.givenName || "",
              profile.name?.familyName || "",
              profile.oid,
              "microsoft",
            ]
          );

          done(null, result.rows[0]);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );
}

module.exports = passport;
