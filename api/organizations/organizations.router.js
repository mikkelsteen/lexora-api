const express = require("express");
const router = express.Router();
const organizationsController = require("./organizations.controller");
const {
  verifyToken,
  verifyOrganizationMember,
  verifyLicense,
} = require("../../middleware/auth.middleware");

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Organization name
 *     responses:
 *       201:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error
 */
router.post("/", verifyToken, organizationsController.createOrganization);

/**
 * @swagger
 * /api/organizations/current:
 *   get:
 *     summary: Get current organization details
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization details with teams and license information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 seats_limit:
 *                   type: integer
 *                 valid_until:
 *                   type: string
 *                   format: date-time
 *                 current_seats:
 *                   type: integer
 *                 teams:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       member_count:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 */
router.get(
  "/current",
  verifyToken,
  verifyOrganizationMember,
  organizationsController.getOrganization
);

/**
 * @swagger
 * /api/organizations/current:
 *   put:
 *     summary: Update current organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 */
router.put(
  "/current",
  verifyToken,
  verifyOrganizationMember,
  organizationsController.updateOrganization
);

/**
 * @swagger
 * /api/organizations/current/members:
 *   get:
 *     summary: Get organization members
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organization members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   email:
 *                     type: string
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   last_login:
 *                     type: string
 *                     format: date-time
 *                   teams:
 *                     type: array
 *                     items:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: License required
 */
router.get(
  "/current/members",
  verifyToken,
  verifyOrganizationMember,
  verifyLicense,
  organizationsController.getMembers
);

/**
 * @swagger
 * /api/organizations/teams:
 *   post:
 *     summary: Create a new team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       201:
 *         description: Team created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: License required
 */
router.post(
  "/teams",
  verifyToken,
  verifyOrganizationMember,
  verifyLicense,
  organizationsController.createTeam
);

/**
 * @swagger
 * /api/organizations/teams/{teamId}:
 *   put:
 *     summary: Update a team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     responses:
 *       200:
 *         description: Team updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: License required
 *       404:
 *         description: Team not found
 */
router.put(
  "/teams/:teamId",
  verifyToken,
  verifyOrganizationMember,
  verifyLicense,
  organizationsController.updateTeam
);

/**
 * @swagger
 * /api/organizations/teams/{teamId}:
 *   delete:
 *     summary: Delete a team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Team deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: License required
 *       404:
 *         description: Team not found
 */
router.delete(
  "/teams/:teamId",
  verifyToken,
  verifyOrganizationMember,
  verifyLicense,
  organizationsController.deleteTeam
);

/**
 * @swagger
 * /api/organizations/teams/{teamId}/members:
 *   put:
 *     summary: Update team members
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Team members updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: License required
 *       404:
 *         description: Team not found
 */
router.put(
  "/teams/:teamId/members",
  verifyToken,
  verifyOrganizationMember,
  verifyLicense,
  organizationsController.manageTeamMembers
);

module.exports = router;
