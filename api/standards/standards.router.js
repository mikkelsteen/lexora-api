const express = require("express");
const router = express.Router();
const standardsController = require("./standards.controller");

/**
 * @swagger
 * /api/standards:
 *   get:
 *     summary: Get standards with pagination and filters
 *     tags: [Standards]
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         description: Filter by organization ID
 *       - in: query
 *         name: topic_id
 *         schema:
 *           type: string
 *         description: Filter by topic ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in standard titles
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Items per page
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [issue_date, title]
 *           default: issue_date
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of standards with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Standard'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 */
router.get("/", standardsController.getStandards);

/**
 * @swagger
 * /api/standards:
 *   post:
 *     summary: Create a new standard
 *     tags: [Standards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               page_link:
 *                 type: string
 *               pdf_link:
 *                 type: string
 *               issue_date:
 *                 type: string
 *                 format: date
 *               closing_comment:
 *                 type: string
 *               status:
 *                 type: string
 *               docket_number:
 *                 type: string
 *               comment:
 *                 type: string
 *               file_name:
 *                 type: string
 *               downloaded:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Standard created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Standard'
 */
router.post("/", standardsController.createStandard);

/**
 * @swagger
 * /api/standards/{id}:
 *   get:
 *     summary: Get a standard by ID
 *     tags: [Standards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Standard ID
 *     responses:
 *       200:
 *         description: Standard details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Standard'
 *       404:
 *         description: Standard not found
 */
router.get("/:id", standardsController.getStandardById);

/**
 * @swagger
 * /api/standards/{id}:
 *   put:
 *     summary: Update a standard
 *     tags: [Standards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Standard ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               page_link:
 *                 type: string
 *               pdf_link:
 *                 type: string
 *               issue_date:
 *                 type: string
 *                 format: date
 *               closing_comment:
 *                 type: string
 *               status:
 *                 type: string
 *               docket_number:
 *                 type: string
 *               comment:
 *                 type: string
 *               file_name:
 *                 type: string
 *               downloaded:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Standard updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Standard'
 *       404:
 *         description: Standard not found
 */
router.put("/:id", standardsController.updateStandard);

/**
 * @swagger
 * /api/standards/{id}:
 *   delete:
 *     summary: Delete a standard
 *     tags: [Standards]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Standard ID
 *     responses:
 *       200:
 *         description: Standard deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                 deletedStandard:
 *                   $ref: '#/components/schemas/Standard'
 *       404:
 *         description: Standard not found
 */
router.delete("/:id", standardsController.deleteStandard);

module.exports = router;
