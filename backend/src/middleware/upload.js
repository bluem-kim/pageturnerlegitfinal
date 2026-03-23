const multer = require("multer");
const os = require("os");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".jpg";
    cb(null, `pt-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const imageOnly = (req, file, cb) => {
  const mime = String(file.mimetype || "").toLowerCase();
  const name = String(file.originalname || "").toLowerCase();
  const looksLikeImageByName = /\.(jpg|jpeg|png|webp|heic|heif|gif)$/.test(name);

  if (!(mime.startsWith("image/") || looksLikeImageByName)) {
    cb(new Error("Only image files are allowed"));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter: imageOnly,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

module.exports = upload;
