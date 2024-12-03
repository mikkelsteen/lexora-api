const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Lexora API Documentation",
      version: "1.0.0",
      description: "API documentation for Lexora platform",
      contact: {
        name: "API Support",
        email: "support@yourdomain.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3002",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            email: {
              type: "string",
              format: "email",
            },
            firstName: {
              type: "string",
            },
            lastName: {
              type: "string",
            },
            organizationId: {
              type: "string",
              format: "uuid",
            },
            authType: {
              type: "string",
              enum: ["local", "magic-link", "google", "microsoft"],
            },
            isActive: {
              type: "boolean",
            },
            lastLogin: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Organization: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Team: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
            },
            organizationId: {
              type: "string",
              format: "uuid",
            },
          },
        },
        Standard: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            title: {
              type: "string",
            },
            pageLink: {
              type: "string",
            },
            pdfLink: {
              type: "string",
            },
            issueDate: {
              type: "string",
              format: "date",
            },
            closingComment: {
              type: "string",
            },
            status: {
              type: "string",
            },
            docketNumber: {
              type: "string",
            },
            comment: {
              type: "string",
            },
            fileName: {
              type: "string",
            },
            downloaded: {
              type: "boolean",
            },
            organizations: {
              type: "array",
              items: {
                $ref: "#/components/schemas/FDAOrganization",
              },
            },
            topics: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Topic",
              },
            },
          },
        },
        Topic: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
            },
          },
          required: ["name"],
        },
        FDAOrganization: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
            },
          },
          required: ["name"],
        },
        License: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            organizationId: {
              type: "string",
              format: "uuid",
            },
            seatsLimit: {
              type: "integer",
              minimum: 1,
            },
            validUntil: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Auth",
        description: "Authentication endpoints",
      },
      {
        name: "Users",
        description: "User management endpoints",
      },
      {
        name: "Organizations",
        description: "Organization management endpoints",
      },
      {
        name: "Teams",
        description: "Team management endpoints",
      },
      {
        name: "Standards",
        description: "Standards management endpoints",
      },
      {
        name: "Topics",
        description: "Topics management endpoints",
      },
      {
        name: "FDA Organizations",
        description: "FDA Organizations management endpoints",
      },
    ],
  },
  apis: [
    "./api/auth/auth.router.js",
    "./api/users/users.router.js",
    "./api/organizations/organizations.router.js",
    "./api/standards/standards.router.js",
    "./api/topics/topics.router.js",
    "./api/fda_organization/fda_organization.router.js",
  ],
};

module.exports = swaggerJsdoc(options);
