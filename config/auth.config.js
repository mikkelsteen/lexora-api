require("dotenv").config();

module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: "1d",
    refreshExpiresIn: "7d",
  },
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
  },
  microsoft: {
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: "/api/auth/microsoft/callback",
    tenant: process.env.MICROSOFT_TENANT_ID,
  },
  email: {
    from: process.env.EMAIL_FROM || "noreply@lexora.io",
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  },
  magicLink: {
    expiresIn: "15m",
  },
  session: {
    secret: process.env.SESSION_SECRET,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
};
