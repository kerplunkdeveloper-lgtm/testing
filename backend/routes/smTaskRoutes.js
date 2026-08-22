const express = require("express");
const router = express.Router();

const {
  getSMTasks,
  getSMTaskById,
  createSMTask,
  updateSMTask,
  deleteSMTask,
  toggleSubtask,
  clearAllSMTasks,
} = require("../controllers/smTaskController");

const { protect, authorize } = require("../middleware/auth");

router.use(protect);

router.delete("/clear-all", authorize("admin", "operationmanager", "team"), clearAllSMTasks);

router
  .route("/")
  .get(getSMTasks)
  .post(authorize("admin", "operationmanager", "team"), createSMTask);

router
  .route("/:id")
  .get(getSMTaskById)
  .put(authorize("admin", "operationmanager", "team"), updateSMTask)
  .delete(authorize("admin", "operationmanager", "team"), deleteSMTask);

router
  .route("/:id/subtasks/:subtaskId")
  .patch(authorize("admin", "operationmanager", "team"), toggleSubtask);

module.exports = router;
