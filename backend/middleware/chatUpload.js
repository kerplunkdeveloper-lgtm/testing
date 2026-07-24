const multer = require("multer");

const storage = multer.diskStorage({});

const chatFileFilter = (req, file, cb) => {
  // We accept all files for chat, size checks are done by limits
  cb(null, true);
};

const chatUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: chatFileFilter,
});

module.exports = chatUpload;
