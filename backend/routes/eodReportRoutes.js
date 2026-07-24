const express = require('express');
const {
  createEodReport,
  getEodReports,
  getEodReport,
  updateEodReport,
  uploadEodAttachment,
  deleteEodReport,
} = require('../controllers/eodReportController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const chatUpload = require('../middleware/chatUpload');

router
  .route('/')
  .get(protect, getEodReports)
  .post(protect, authorize('team'), createEodReport);

router.post('/upload', protect, authorize('team'), chatUpload.single('file'), uploadEodAttachment);

router
  .route('/:id')
  .get(protect, getEodReport)
  .put(protect, authorize('team'), updateEodReport)
  .delete(protect, deleteEodReport);

module.exports = router;

