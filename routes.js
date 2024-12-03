const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger.config");
const router = express.Router();

const standardsRouter = require("./api/standards/standards.router");
const topicsRouter = require("./api/topics/topics.router");
const fdaOrganizationRouter = require("./api/fda_organization/fda_organization.router");
const authRouter = require("./api/auth/auth.router");
const usersRouter = require("./api/users/users.router");
const organizationsRouter = require("./api/organizations/organizations.router");

// Swagger documentation
router.use("/api-docs", swaggerUi.serve);
router.get(
  "/api-docs",
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Lexora API Documentation",
  })
);

// Public routes
router.use("/auth", authRouter);

// Protected routes
router.use("/users", usersRouter);
router.use("/organizations", organizationsRouter);
router.use("/standards", standardsRouter);
router.use("/topics", topicsRouter);
router.use("/fda_organization", fdaOrganizationRouter);

// API documentation in JSON format
router.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

module.exports = router;
