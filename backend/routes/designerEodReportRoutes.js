const express = require('express');
const {
  createDesignerEodReport,
  getDesignerEodReports,
  getDesignerEodReport,
  updateDesignerEodReport,
  uploadDesignerEodAttachment,
  deleteDesignerEodReport,
} = require('../controllers/designerEodReportController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const chatUpload = require('../middleware/chatUpload');

router
  .route('/')
  .get(protect, getDesignerEodReports)
  .post(protect, authorize('team'), createDesignerEodReport);

router.post('/upload', protect, authorize('team'), chatUpload.single('file'), uploadDesignerEodAttachment);

router
  .route('/:id')
  .get(protect, getDesignerEodReport)
  .put(protect, authorize('team'), updateDesignerEodReport)
  .delete(protect, deleteDesignerEodReport);

module.exports = router;

