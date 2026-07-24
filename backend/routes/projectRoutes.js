const express = require("express");
const {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router
  .route("/")
  .get(protect, getProjects)
  .post(protect, authorize("admin", "operationmanager", "team"), createProject);

router
  .route("/:id")
  .put(protect, authorize("admin", "operationmanager", "team"), updateProject)
  .delete(protect, authorize("admin", "operationmanager", "team"), deleteProject);

module.exports = router;
