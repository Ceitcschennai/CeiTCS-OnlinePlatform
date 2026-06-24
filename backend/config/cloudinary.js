const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// ─────────────────────────────────────────────────────────────────────────────
// Cloudinary config — reads from .env
// ─────────────────────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─────────────────────────────────────────────────────────────────────────────
// Storage — PDF, Docs, Videos all go to Cloudinary "study-materials" folder
// ─────────────────────────────────────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Determine resource type based on mimetype
    let resourceType = "raw"; // default for PDF, DOC, PPT
    if (file.mimetype.startsWith("video/")) resourceType = "video";
    if (file.mimetype.startsWith("image/")) resourceType = "image";

    return {
      folder:        "study-materials",
      resource_type: resourceType,
      // Keep original filename (sanitized)
      public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// File filter — only allow safe file types
// ─────────────────────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "video/mp4",
    "video/webm",
    "image/jpeg",
    "image/png",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Multer instance — max 100MB
// ─────────────────────────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

module.exports = { cloudinary, upload };