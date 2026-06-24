const express  = require("express");
const router   = express.Router();
const { cloudinary, upload } = require("../config/cloudinary");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/materials/upload  — Upload NEW material
// ─────────────────────────────────────────────────────────────────────────────
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    console.log("✅ Uploaded:", req.file.path);
    res.json({
      success:  true,
      fileUrl:  req.file.path,
      fileName: req.file.originalname,
      publicId: req.file.filename,
      subject:  req.body.subject || "",
      title:    req.body.title   || "",
    });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/materials/update  — Replace existing material
// Deletes old file from Cloudinary, uploads new one
// Form fields: file, oldPublicId, oldResourceType, subject, title
// ─────────────────────────────────────────────────────────────────────────────
router.put("/update", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No new file provided" });
    }

    const { oldPublicId, oldResourceType = "raw" } = req.body;

    // Step 1 — delete the old file (don't block update if this fails)
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId, {
          resource_type: oldResourceType,
        });
        console.log("🗑️ Old file deleted:", oldPublicId);
      } catch (e) {
        console.warn("⚠️ Could not delete old file:", e.message);
      }
    }

    // Step 2 — new file already uploaded by multer
    console.log("✅ New file uploaded:", req.file.path);

    res.json({
      success:  true,
      fileUrl:  req.file.path,
      fileName: req.file.originalname,
      publicId: req.file.filename,
      subject:  req.body.subject || "",
      title:    req.body.title   || "",
      message:  "Material updated successfully ✅",
    });

  } catch (err) {
    console.error("❌ Update error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Update failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/materials/delete  — Remove material from Cloudinary
// Body JSON: { publicId, resourceType }
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/delete", async (req, res) => {
  try {
    const { publicId, resourceType = "raw" } = req.body;
    if (!publicId) {
      return res.status(400).json({ success: false, message: "publicId is required" });
    }
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log("🗑️ Cloudinary delete:", result);
    res.json({ success: true, result });
  } catch (err) {
    console.error("❌ Delete error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Delete failed" });
  }
});

module.exports = router;