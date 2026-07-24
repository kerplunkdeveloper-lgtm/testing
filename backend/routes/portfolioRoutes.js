const express = require("express");
const {
  getPortfolios,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  addProjectsToPortfolio,
  removeProjectFromPortfolio,
} = require("../controllers/portfolioController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router
  .route("/")
  .get(protect, getPortfolios)
  .post(protect, authorize("admin", "operationmanager","team"), createPortfolio);

router
  .route("/:id")
  .put(protect, authorize("admin", "operationmanager","team"), updatePortfolio)
  .delete(protect, authorize("admin", "operationmanager","team"), deletePortfolio);

router
  .route("/:id/projects")
  .put(protect, authorize("admin", "operationmanager","team"), addProjectsToPortfolio);

router
  .route("/:id/projects/:projectId")
  .delete(protect, authorize("admin", "operationmanager","team"), removeProjectFromPortfolio);

module.exports = router;
