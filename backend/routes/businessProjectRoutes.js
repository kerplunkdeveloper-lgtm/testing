const express = require("express");
const {
  getBusinessProjects,
  createBusinessProject,
  updateBusinessProject,
  deleteBusinessProject,
  assignEmployee,
} = require("../controllers/businessProjectController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router
  .route("/")
  .get(protect, authorize("admin", "operationmanager", "team"), getBusinessProjects)
  .post(protect, authorize("admin", "operationmanager"), createBusinessProject);

router
  .route("/:id/assign")
  .post(protect, authorize("admin", "operationmanager"), assignEmployee);

router
  .route("/:id")
  .put(protect, authorize("admin", "operationmanager"), updateBusinessProject)
  .delete(protect, authorize("admin", "operationmanager"), deleteBusinessProject);

module.exports = router;
