const express = require("express");
const {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router
  .route("/")
  .get(protect, getTasks)
  .post(protect, authorize("admin", "operationmanager", "team"), createTask);

router
  .route("/:id")
  .put(protect, updateTask)
  .delete(protect, authorize("admin", "operationmanager", "team"), deleteTask);

module.exports = router;
