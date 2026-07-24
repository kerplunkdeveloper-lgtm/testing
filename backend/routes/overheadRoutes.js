const express = require("express");
const { getOverheads, updateOverheadsBulk } = require("../controllers/overheadController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router
  .route("/")
  .get(protect, authorize("admin", "operationmanager"), getOverheads);

router
  .route("/bulk")
  .post(protect, authorize("admin"), updateOverheadsBulk);

module.exports = router;
