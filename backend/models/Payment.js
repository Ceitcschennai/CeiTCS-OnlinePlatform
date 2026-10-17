const mongoose = require("mongoose");

/* ============================================
   PAYMENT MODEL (participant fee payments)

   SECURITY NOTES
   --------------
   participantId, amount, status, paymentDate,
   verifiedBy and verifiedAt are ALWAYS derived
   server-side. They are never accepted from the
   client (see routes/paymentroutes.js).

   Step 1 (payment proof): optional proof fields
   below are server-derived from the validated
   upload (see config/paymentProofUpload.js).
   proofPublicId is the Cloudinary private asset
   identifier; proofUrl (when present) is the
   private delivery reference returned by
   Cloudinary and is NOT a public URL — actual
   bytes are served only via the authorized
   GET /api/payments/:id/proof route which mints
   a short-lived signed URL after an
   owner-or-admin check.

   This model is SEPARATE from Employee.paymentStatus
   (enum "Paid" / "Unpaid"), which stays untouched and
   is still used by Queries, dashboards and scheduling.

   Verification is MANUAL UPI verification:
     PENDING  -> admin submits/verifies reference
     PAID / REJECTED -> decided by an admin later
============================================ */

const paymentSchema = new mongoose.Schema(
  {
    // Owner of the payment — derived from the authenticated JWT
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },

    // Course the payment is for (canonical Course.courseCode)
    courseCode: {
      type: String,
      required: true,
      trim: true
    },
    

    // Authoritative amount — always taken from Course.price
    amount: {
      type: Number,
      required: true,
      min: 0
    },

    // Participant supplied UPI / bank reference id.
    // QR method (UPI): required. UPI-ID method (UPI_ID): omitted —
    // the field is left MISSING (never explicit null) so the unique
    // PARTIAL index below skips it and many UPI-ID records coexist.
    transactionId: {
      type: String,
      required: false,
      default: undefined,
      trim: true
    },

    // Participant's own UPI ID (VPA) for the UPI_ID method only.
    // Optional + unset for QR records; never credentials (no PIN/OTP).
    payerUpiId: {
      type: String,
      required: false,
      default: undefined,
      trim: true,
      lowercase: true
    },

    paymentMethod: {
      type: String,
      required: true,
      trim: true
    },

    // Manual verification lifecycle — never set from the client
    status: {
      type: String,
      enum: ["PENDING", "PAID", "REJECTED"],
      default: "PENDING"
    },

    // Server timestamp of submission
    paymentDate: {
      type: Date,
      default: Date.now
    },

    // Filled only during future admin verification
    adminRemarks: {
      type: String,
      default: ""
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },

    verifiedAt: {
      type: Date,
      default: null
    },

    // ---- Step 1: optional payment-proof fields ----
    // All optional so pre-existing records keep working.
    // Set only from the validated upload pipeline.

    // Cloudinary private asset identifier, e.g. "payment-proofs/<uuid>"
    proofPublicId: {
      type: String,
      default: null,
      trim: true
    },

    // Private delivery reference returned by Cloudinary
    // (NOT a public URL — requires a signed URL minted by
    // the authorized GET /:id/proof route).
    proofUrl: {
      type: String,
      default: null,
      trim: true
    },

    // Server-verified MIME from magic-byte inspection
    // (one of image/jpeg, image/png, image/webp)
    proofMime: {
      type: String,
      default: null,
      trim: true
    },

    // File size in bytes (validated <= 5 MB pre-upload)
    proofSize: {
      type: Number,
      default: null,
      min: 0
    },

    // ---- Step 6B: optional official bill number ----
    // Assigned server-side only, at PENDING -> PAID approval time.
    // Optional with NO default so an unissued payment OMITS the field
    // entirely — persisting an explicit `null` would be indexed and
    // would collide with every other unissued payment under a unique
    // index (sparse indexes skip only MISSING fields, not nulls).
    // Never set from the client and never generated in the schema.
    billNumber: {
      type: String,
      default: undefined,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// transactionId uniqueness applies ONLY to real (string) references:
// UPI_ID records omit the field (missing, never null) and are skipped
// by the partial filter, so many can coexist. Mirrors the billNumber
// partial-index pattern below. NOTE: this schema change requires the
// matching DB index migration (plain unique -> partial unique;
// see migration log in the implementation report) — Mongoose does not
// alter an existing index's options automatically.
paymentSchema.index(
  { transactionId: 1 },
  { unique: true, partialFilterExpression: { transactionId: { $type: "string" } } }
);

// Participant payment history (newest first)
paymentSchema.index({ participantId: 1, paymentDate: -1 });

// Course based reporting
paymentSchema.index({ courseCode: 1 });

// Manual verification queue
paymentSchema.index({ status: 1 });

// Step 6C second layer of protection: bill numbers must stay unique,
// while documents without one (PENDING / REJECTED / legacy) coexist.
// A unique SPARSE index is NOT safe here: sparse skips only documents
// where the field is MISSING, so documents storing an explicit null
// were indexed and the second one failed with E11000. A unique
// PARTIAL index applies uniqueness only to issued (string) bill
// numbers. NOTE: if the database already holds the old sparse index,
// replace it manually with backend/migrate-bill-number-index.js —
// Mongoose will not silently alter an existing index's options.
paymentSchema.index(
  { billNumber: 1 },
  { unique: true, partialFilterExpression: { billNumber: { $type: "string" } } }
);

module.exports = mongoose.model("Payment", paymentSchema);
