const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { cloudinary } = require("./cloudinary");

/* ============================================
   PAYMENT PROOF UPLOAD (Step 1 — backend only)

   Dedicated pipeline for participant payment
   screenshots. SEPARATE from:
     - backend/config/cloudinary.js  (study-materials, 100 MB)
     - backend/middleware/upload.js  (disk storage — NEVER used here)

   Guarantees:
     - JPEG / PNG / WebP only (magic-byte verified)
     - max 5 MB (enforced by multer limits AND a
       pre-upload buffer check)
     - memory storage: signatures are inspected
       BEFORE anything reaches Cloudinary
     - randomized asset ids, dedicated folder
       "payment-proofs"
     - Cloudinary type:"private" so stored bytes
       are NOT publicly reachable; the backend
       mints short-lived signed URLs only after
       an owner-or-admin check
       (see GET /api/payments/:id/proof)

   No new dependencies: uses multer, uuid and
   cloudinary already in backend/package.json.
============================================ */

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const WEBP_RIFF = Buffer.from([0x52, 0x49, 0x46, 0x46]); // "RIFF" @0
const WEBP_WEBP = Buffer.from([0x57, 0x45, 0x42, 0x50]); // "WEBP" @8

// Inspect leading magic bytes; returns verified MIME or null.
const detectImageMime = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer.subarray(0, 3).equals(JPEG_SIG)) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(PNG_SIG)) return "image/png";
  if (
    buffer.subarray(0, 4).equals(WEBP_RIFF) &&
    buffer.subarray(8, 12).equals(WEBP_WEBP)
  ) {
    return "image/webp";
  }
  return null;
};

const proofFileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  const err = new Error(
    "Only JPEG, PNG or WebP screenshots are allowed (max 5 MB)"
  );
  err.statusCode = 400;
  return cb(err, false);
};

// Memory storage — nothing touches Cloudinary until
// detectImageMime() + size checks pass in the route.
const proofUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: proofFileFilter,
  limits: { fileSize: MAX_PROOF_BYTES, files: 1 },
});

// Upload an already-validated buffer to the private folder.
const uploadProofBuffer = (buffer, verifiedMime) =>
  new Promise((resolve, reject) => {
    const publicId = `payment-proofs/${uuidv4()}`;
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "image",
        type: "private", // NOT public — signed URLs only
        access_mode: "authenticated",
        overwrite: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({
          publicId: result.public_id || publicId,
          // Private delivery reference (not directly fetchable
          // without a signed URL).
          secureUrl: result.secure_url || null,
          bytes: result.bytes || buffer.length,
          verifiedMime,
        });
      }
    );
    stream.on("error", reject);
    stream.end(buffer);
  });

const deleteProofAsset = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(String(publicId), {
      resource_type: "image",
      type: "private",
    });
  } catch (err) {
    // Best-effort orphan cleanup — never fail the request on this.
    console.error(
      "PAYMENT PROOF CLEANUP ERROR:",
      err && err.message ? err.message : err
    );
  }
};

// Short-lived signed URL for an authorized viewer.
// NOTE: requires Cloudinary "Restricted" media delivery for
// type:"private" to be enforced by Cloudinary plan settings;
// the backend owner-or-admin check always runs first.
const signedProofUrl = (publicId, expiresAtSeconds = 300) =>
  cloudinary.utils.private_download_url(publicId, "", {
    resource_type: "image",
    type: "private",
    expires_at: Math.floor(Date.now() / 1000) + expiresAtSeconds,
  });

module.exports = {
  proofUpload,
  detectImageMime,
  uploadProofBuffer,
  deleteProofAsset,
  signedProofUrl,
  MAX_PROOF_BYTES,
};
