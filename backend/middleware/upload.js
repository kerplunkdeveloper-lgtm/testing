const multer = require("multer");

const path = require("path");

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    cb(null, file.fieldname + "-" + Date.now() + "." + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new Error(`Only images are allowed. You tried to upload: ${file.mimetype}`),
      false
    );
  }
};

const upload = multer({

  storage,

 limits: {
  fileSize: 10 * 1024 * 1024, // 10MB
},

  fileFilter,

});

module.exports = upload;