const express = require("express");
const router = express.Router();
const fdaOrganizationController = require("./fda_organization.controller");

/**
 * @swagger
 * /api/fda_organization:
 *   get:
 *     summary: Get all FDA organizations
 *     tags: [FDA Organizations]
 *     responses:
 *       200:
 *         description: List of all FDA organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FDAOrganization'
 *       500:
 *         description: Server Error
 */
router.get("/", fdaOrganizationController.getAllFDAOrganizations);

/**
 * @swagger
 * /api/fda_organization:
 *   post:
 *     summary: Create a new FDA organization
 *     tags: [FDA Organizations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the FDA organization
 *     responses:
 *       201:
 *         description: FDA organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FDAOrganization'
 *       500:
 *         description: Server Error
 */
router.post("/", fdaOrganizationController.createFDAOrganization);

/**
 * @swagger
 * /api/fda_organization/{id}:
 *   get:
 *     summary: Get an FDA organization by ID
 *     tags: [FDA Organizations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FDA Organization ID
 *     responses:
 *       200:
 *         description: FDA organization details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FDAOrganization'
 *       404:
 *         description: FDA Organization not found
 *       500:
 *         description: Server Error
 */
router.get("/:id", fdaOrganizationController.getFDAOrganizationById);

/**
 * @swagger
 * /api/fda_organization/{id}:
 *   put:
 *     summary: Update an FDA organization
 *     tags: [FDA Organizations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FDA Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The new name for the FDA organization
 *     responses:
 *       200:
 *         description: FDA organization updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FDAOrganization'
 *       404:
 *         description: FDA Organization not found
 *       500:
 *         description: Server Error
 */
router.put("/:id", fdaOrganizationController.updateFDAOrganization);

/**
 * @swagger
 * /api/fda_organization/{id}:
 *   delete:
 *     summary: Delete an FDA organization
 *     tags: [FDA Organizations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: FDA Organization ID
 *     responses:
 *       200:
 *         description: FDA organization deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                 deletedOrganization:
 *                   $ref: '#/components/schemas/FDAOrganization'
 *       404:
 *         description: FDA Organization not found
 *       500:
 *         description: Server Error
 */
router.delete("/:id", fdaOrganizationController.deleteFDAOrganization);

module.exports = router;
