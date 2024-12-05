/**
 * @fileoverview Main application entry point
 * @description Sets up Express server with authentication, session management,
 * and API documentation
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("./config/passport.config");
const pgSession = require("connect-pg-simple")(session);
const helmet = require("helmet");
const pool = require("./db");
const routes = require("./routes");
const authConfig = require("./config/auth.config");
const errorHandler = require("./middleware/error.middleware");
const {
  errorResponse,
  ServiceErrorTypes,
} = require("./utils/response.handler");

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_URL || "http://localhost:3000",
        ],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    /localhost:\d{4}$/, // Allow any localhost port for development
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
};
app.use(cors(corsOptions));

// Request parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session configuration
app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "session",
    }),
    secret: authConfig.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: authConfig.session.cookie.maxAge,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
      domain:
        process.env.NODE_ENV === "production" ? ".yourdomain.com" : undefined,
    },
  })
);

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

// Rate limiting middleware
const rateLimit = require("express-rate-limit");
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});
app.use("/api/", apiLimiter);

// Routes
app.use(routes);

// Handle 404 errors
app.use((req, res) => {
  res
    .status(404)
    .json(errorResponse("Resource not found", ServiceErrorTypes.NOT_FOUND));
});

// Global error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    `API Documentation available at http://localhost:${PORT}/api-docs`
  );
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Performing graceful shutdown...");
  pool.end(() => {
    console.log("Database pool closed.");
    process.exit(0);
  });
});
