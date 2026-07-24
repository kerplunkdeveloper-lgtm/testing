const express = require("express");

const router = express.Router();

const {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateStatus,
} = require("../controllers/templateController");



const { protect, authorize } = require('../middleware/auth');



// CREATE
router.post(
  "/",
  protect,
  authorize("admin"),
  createTemplate
);

// GET ALL
router.get("/", getTemplates);

// GET SINGLE
router.get("/:id", getTemplate);

// UPDATE
router.put(
  "/:id",
  protect,
  authorize("admin"),
  updateTemplate
);

// DELETE
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteTemplate
);

// TOGGLE ACTIVE
router.patch(
  "/:id/toggle",
  protect,
  authorize("admin"),
  toggleTemplateStatus
);

module.exports = router;