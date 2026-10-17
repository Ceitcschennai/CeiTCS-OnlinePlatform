const express = require("express");
const router = express.Router();

const Payment = require("../models/Payment");
const BillCounter = require("../models/BillCounter");
const Course = require("../models/Course");
const Employee = require("../models/Employee");
const { protect, authorize, getUserRole } = require("../middleware/authMiddleware");
const {
  proofUpload,
  detectImageMime,
  uploadProofBuffer,
  deleteProofAsset,
  signedProofUrl,
  MAX_PROOF_BYTES,
} = require("../config/paymentProofUpload");

// Shared Nodemailer transporter (config/email.js) — the SAME instance
// every existing module uses (registration, faculty, schedule, mentor
// requests). Reused here; never create a second transporter.
const transporter = require("../config/email");
const { generateBillPdf, billPdfFilename } = require("../utils/billPdf");

/* ============================================
   HELPERS
============================================ */

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeValue = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const sameCourseCode = (a, b) =>
  normalizeValue(a).toLowerCase() === normalizeValue(b).toLowerCase();

/* Course lookup: exact match first, then a safe
   case-insensitive exact match (course codes are stored
   as e.g. "Python010", "Java010"). */
const findCourseByCode = async (courseCode) => {
  const code = normalizeValue(courseCode);
  if (!code) return null;

  const exact = await Course.findOne({ courseCode: code }).maxTimeMS(8000);
  if (exact) return exact;

  return Course.findOne({
    courseCode: { $regex: `^${escapeRegExp(code)}$`, $options: "i" }
  }).maxTimeMS(8000);
};

/* EXISTING enrollment structure (not a new system):
     Employee.courseCode                    -> main course
     Employee.enrolledSubjects[].courseCode -> enrolled subjects
   Kept in sync with the checks already used by
   assignmentroutes.js / queryroutes.js. */
const isEnrolledInCourse = (employee, courseCode) => {
  if (!employee) return false;

  if (sameCourseCode(employee.courseCode, courseCode)) return true;

  if (Array.isArray(employee.enrolledSubjects)) {
    return employee.enrolledSubjects.some(
      (subject) => subject && sameCourseCode(subject.courseCode, courseCode)
    );
  }

  return false;
};

const isPositiveAmount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/* ============================================
   PAYMENT NOTIFICATION EMAILS (Case 1 & 2)
   Reuses the shared transporter from config/email.js.
   ADMIN RECIPIENT: process.env.EMAIL_USER — the same
   configured institute inbox every other module uses
   as the admin notification address.

   SAFETY RULES
   - Sent only AFTER the durable write: submission
     emails after payment.save(); approval emails only
     when THIS request won the PENDING -> PAID
     conditional update (bill number persisted). A
     repeated or lost-race approval exits with 409
     earlier and can never send another approval email.
   - Each recipient send is wrapped in its OWN
     try/catch: a failure for one recipient never
     blocks (or can fail) the other recipient's attempt.
   - sendPaymentEmail never throws and never affects
     the saved payment, the bill number, or the HTTP
     response. Failures are logged (error message only
     — no credentials, no proof URLs).
   - A missing/invalid recipient address is logged and
     skipped; the payment route continues normally.
   - Submission emails always state PENDING / pending
     verification, never claim approval, and never
     contain a bill number (none exists yet). Approval
     emails include the ACTUAL persisted bill number.
   - No new bill generation logic; no schema changes;
     status flow, funds-verification and authorization
     rules are untouched.
============================================ */

/* Trusted application URL for email links — never the request Host
   header. Set FRONTEND_URL (preferred) or fall back to the known
   production frontend; localhost for non-production. */
const getAppBaseUrl = () => {
  const configured = String(
    process.env.FRONTEND_URL || process.env.APP_URL || process.env.CLIENT_URL || ""
  ).trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return "https://ceitcsprofessionaltraining.vercel.app";
  return "http://localhost:3000";
};

/* Secure bill-download link: points at the authenticated frontend page
   (participant signs in; backend ownership checks always run). Never a
   public or guessable bill URL, never bypasses auth. */
const getBillDownloadLink = (paymentId) =>
  `${getAppBaseUrl()}/payment-history?bill=${encodeURIComponent(String(paymentId))}`;

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

// Escapes values interpolated into email HTML (participant
// and course titles originate from users).
const escapeHtml = (value) =>
  String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* Sends ONE email through the shared transporter. Never throws:
   - invalid / missing recipient -> logged + skipped (returns false)
   - SMTP or config failure      -> logged (message only) + false */
const sendPaymentEmail = async (label, to, subject, html) => {
  const recipient = normalizeValue(to);
  if (!isValidEmail(recipient)) {
    console.error(`PAYMENT EMAIL SKIPPED (${label}): missing or invalid recipient`);
    return false;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER, // existing configured institute inbox
      to: recipient,
      subject,
      html
    });
    return true;
  } catch (err) {
    console.error(`PAYMENT EMAIL FAILED (${label}):`, err && err.message ? err.message : err);
    return false;
  }
};

/* Case 1 — submission emails. Called ONLY after payment.save()
   succeeded (POST /). No bill number exists at this point: none is
   sent, and both emails state the payment is PENDING verification. */
const sendSubmissionEmails = async (participant, course, payment) => {
  const participantName =
    normalizeValue(participant && participant.firstName) || "Participant";
  const participantEmail = participant ? participant.email : "";
  const courseName = normalizeValue(course && course.courseName);
  const courseCode = normalizeValue(payment.courseCode);
  const courseLabel = courseName ? `${courseName} (${courseCode})` : courseCode;
  // Submission emails show the transaction reference only.
  // Never include the participant's UPI ID in email content.
  const evidenceLine = normalizeValue(payment.transactionId)
    ? `<strong>Transaction reference:</strong> ${escapeHtml(normalizeValue(payment.transactionId))}<br/>`
    : `<strong>Transaction reference:</strong> Not provided<br/>`;

  // 1) Participant — submission confirmation (independent try/catch)
  try {
    await sendPaymentEmail(
      "submission/participant",
      participantEmail,
      "Course Fee Payment Received - Pending Verification",
      `
        <h3>Hi ${escapeHtml(participantName)},</h3>
        <p>We have received your course fee payment submission.</p>
        <p>
          <strong>Course:</strong> ${escapeHtml(courseLabel)}<br/>
          <strong>Amount:</strong> ${escapeHtml(payment.amount)}<br/>
          ${evidenceLine}
          <strong>Status:</strong> PENDING - pending verification
        </p>
        <p>
          Your payment has <strong>not been approved yet</strong>. It must
          first be verified by the institute; you will receive a separate
          approval email once it has been verified.
        </p>
        <p>Thank you,<br/>CEITCS Team</p>
      `
    );
  } catch (emailErr) {
    console.error("PAYMENT EMAIL ERROR (submission/participant):", emailErr && emailErr.message);
  }

  // 2) Admin — new payment awaiting verification (independent try/catch)
  try {
    await sendPaymentEmail(
      "submission/admin",
      process.env.EMAIL_USER,
      `New Course Fee Payment Pending Verification - ${courseCode}`,
      `
        <h3>New Payment Submission</h3>
        <p>A participant submitted a course fee payment that requires verification.</p>
        <p>
          <strong>Participant:</strong> ${escapeHtml(participantName)}<br/>
          <strong>Email:</strong> ${escapeHtml(participantEmail)}<br/>
          <strong>Course:</strong> ${escapeHtml(courseLabel)}<br/>
          <strong>Amount:</strong> ${escapeHtml(payment.amount)}<br/>
          ${evidenceLine}
          <strong>Status:</strong> PENDING - awaiting verification
        </p>
        <p>Review it under Admin &gt; Manage Payments.</p>
      `
    );
  } catch (emailErr) {
    console.error("PAYMENT EMAIL ERROR (submission/admin):", emailErr && emailErr.message);
  }
};

/* Case 2 — approval emails. Called ONLY from the approve path of
   applyVerificationDecision AFTER the conditional PENDING -> PAID
   update returned the persisted payment (status + billNumber
   committed together). Repeated or lost-race approvals exit earlier
   (409) and can never send these emails. */
const sendApprovalEmails = async (payment) => {
  // Display lookups — a failure only skips/degrades the affected
  // email; it can never fail or alter the approval itself.
  let participant = null;
  let course = null;

  try {
    participant = await Employee.findById(payment.participantId).maxTimeMS(8000);
  } catch (err) {
    console.error("PAYMENT APPROVAL EMAIL: participant lookup failed:", err && err.message);
  }

  try {
    course = await findCourseByCode(payment.courseCode);
  } catch (err) {
    console.error("PAYMENT APPROVAL EMAIL: course lookup failed:", err && err.message);
  }

  const participantName =
    normalizeValue(participant && participant.firstName) || "Participant";
  const participantEmail = participant ? participant.email : "";
  const courseName = normalizeValue(course && course.courseName);
  const courseCode = normalizeValue(payment.courseCode);
  const courseLabel = courseName ? `${courseName} (${courseCode})` : courseCode;
  const billNumber = normalizeValue(payment.billNumber);

  // 1) Participant — approval confirmation (independent try/catch)
  try {
    await sendPaymentEmail(
      "approval/participant",
      participantEmail,
      `Course Fee Payment Approved - Bill ${billNumber}`,
      `
        <h3>Congratulations, ${escapeHtml(participantName)}!</h3>
        <p>Your course fee payment has been <strong>approved</strong>.</p>
        <p>
          <strong>Course:</strong> ${escapeHtml(courseLabel)}<br/>
          <strong>Verified amount:</strong> ${escapeHtml(payment.amount)}<br/>
          <strong>Transaction reference:</strong> ${escapeHtml(payment.transactionId)}<br/>
          <strong>Bill number:</strong> ${escapeHtml(billNumber)}<br/>
          <strong>Status:</strong> PAID - approved
        </p>
        <p>Please keep the bill number for your records.</p>
        <p><a href="${escapeHtml(getBillDownloadLink(payment._id))}">Download your bill (PDF)</a> — please sign in if necessary; only your own approved bill can be downloaded.</p>
        <p>Thank you,<br/>CEITCS Team</p>
      `
    );
  } catch (emailErr) {
    console.error("PAYMENT EMAIL ERROR (approval/participant):", emailErr && emailErr.message);
  }

  // 2) Admin — approval confirmation (independent try/catch)
  try {
    await sendPaymentEmail(
      "approval/admin",
      process.env.EMAIL_USER,
      `Course Fee Payment Approved - ${courseCode} - Bill ${billNumber}`,
      `
        <h3>Payment Approved</h3>
        <p>
          <strong>Participant:</strong> ${escapeHtml(participantName)}<br/>
          <strong>Email:</strong> ${escapeHtml(participantEmail)}<br/>
          <strong>Course:</strong> ${escapeHtml(courseLabel)}<br/>
          <strong>Verified amount:</strong> ${escapeHtml(payment.amount)}<br/>
          <strong>Transaction reference:</strong> ${escapeHtml(payment.transactionId)}<br/>
          <strong>Bill number:</strong> ${escapeHtml(billNumber)}<br/>
          <strong>Status:</strong> PAID - approved
        </p>
        <p><a href="${escapeHtml(getBillDownloadLink(payment._id))}">Open the approved bill (PDF)</a> — admin sign-in required; ownership checks still apply.</p>
      `
    );
  } catch (emailErr) {
    console.error("PAYMENT EMAIL ERROR (approval/admin):", emailErr && emailErr.message);
  }
};

/* Case 3 — rejection emails. Called ONLY when THIS request won the
   conditional PENDING -> REJECTED update (non-null updated payment).
   Uses the PERSISTED payment.adminRemarks as the feedback source of
   truth — never the raw request body. No bill number is ever sent
   (rejected payments receive none). Fire-and-forget: never throws,
   never alters the rejection or the response. */
const sendRejectionEmails = async (payment) => {
  // Display lookups — a failure only skips/degrades the affected
  // email; it can never fail or alter the rejection itself.
  let participant = null;
  let course = null;

  try {
    participant = await Employee.findById(payment.participantId).maxTimeMS(8000);
  } catch (err) {
    console.error("PAYMENT REJECTION EMAIL: participant lookup failed:", err && err.message);
  }

  try {
    course = await findCourseByCode(payment.courseCode);
  } catch (err) {
    console.error("PAYMENT REJECTION EMAIL: course lookup failed:", err && err.message);
  }

  const participantName =
    normalizeValue(participant && participant.firstName) || "Participant";
  const participantEmail = participant ? participant.email : "";
  const courseName = normalizeValue(course && course.courseName);
  const courseCode = normalizeValue(payment.courseCode);
  const courseLabel = courseName ? `${courseName} (${courseCode})` : courseCode;
  // Exact feedback saved on the persisted payment document.
  const feedback = normalizeValue(payment.adminRemarks) || "No reason provided.";

  // 1) Participant — rejection notice with admin feedback (independent try/catch)
  try {
    await sendPaymentEmail(
      "rejection/participant",
      participantEmail,
      `Course Fee Payment Rejected - ${courseCode}`,
      `
        <h3>Hello, ${escapeHtml(participantName)}</h3>
        <p>Your course fee payment could not be <strong>approved</strong>.</p>
        <p>
          <strong>Course:</strong> ${escapeHtml(courseLabel)}<br/>
          <strong>Amount:</strong> ${escapeHtml(payment.amount)}<br/>
          <strong>Transaction reference:</strong> ${escapeHtml(payment.transactionId)}<br/>
          <strong>Status:</strong> REJECTED
        </p>
        <p>
          <strong>Feedback from the institute:</strong><br/>
          ${escapeHtml(feedback)}
        </p>
        <p>If you need clarification, please contact the institute. You may correct the issue and submit a new payment for verification.</p>
        <p>Thank you,<br/>CEITCS Team</p>
      `
    );
  } catch (emailErr) {
    console.error("PAYMENT EMAIL ERROR (rejection/participant):", emailErr && emailErr.message);
  }

  // 2) Admin — rejection record (independent try/catch)
  try {
    await sendPaymentEmail(
      "rejection/admin",
      process.env.EMAIL_USER,
      `Course Fee Payment Rejected - ${courseCode}`,
      `
        <h3>Payment Rejected</h3>
        <p>
          <strong>Participant:</strong> ${escapeHtml(participantName)}<br/>
          <strong>Email:</strong> ${escapeHtml(participantEmail)}<br/>
          <strong>Course:</strong> ${escapeHtml(courseLabel)}<br/>
          <strong>Amount:</strong> ${escapeHtml(payment.amount)}<br/>
          <strong>Transaction reference:</strong> ${escapeHtml(payment.transactionId)}<br/>
          <strong>Status:</strong> REJECTED
        </p>
        <p>
          <strong>Feedback sent to participant:</strong><br/>
          ${escapeHtml(feedback)}
        </p>
      `
    );
  } catch (emailErr) {
    console.error("PAYMENT EMAIL ERROR (rejection/admin):", emailErr && emailErr.message);
  }
};

/* ============================================
   CREATE PAYMENT
   POST /api/payments
   Auth: protect + "employee" (participant) only

   Two submission methods (paymentMethod allowlist: "UPI" | "UPI_ID"):
     QR method  ("UPI"):    courseCode + transactionId required.
                            Duplicate transaction IDs blocked.
     UPI-ID method ("UPI_ID"): courseCode + payerUpiId + transactionId
                            (UTR) required. Duplicate transaction IDs
                            blocked for BOTH methods (partial unique
                            index + friendly pre-check). Duplicate
                            PENDING UPI-ID requests for the same
                            participant+course return the existing
                            request; a missing UTR may be attached to
                            it once, a conflicting UTR gets 409.

   An OPTIONAL file field "proof" (JPEG/PNG/WebP, max 5 MB,
   magic-byte verified, stored privately under Cloudinary
   "payment-proofs/") is still accepted from legacy/cached
   clients: it is validated ONLY when supplied.

   Server derives (client values are ignored):
     participantId = req.user._id
     amount        = Course.price
     status        = "PENDING"
     paymentDate   = server time
     verifiedBy / verifiedAt / adminRemarks = server only
     proof*        = validated upload only (never client URLs)
   Entering a UPI ID never marks a payment PAID.
============================================ */

/* Participant UPI ID (VPA) format: "<handle>@<bank>", e.g.
   "98765xxxx@okhdfc". Handle: 2+ word/dot/hyphen chars;
   bank tag: 2+ letters. Case-insensitive; stored lowercase. */
const UPI_ID_PATTERN = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/;

const isValidUpiId = (value) => UPI_ID_PATTERN.test(String(value || "").trim());

const PAYMENT_METHOD_QR = "UPI";
const PAYMENT_METHOD_UPI_ID = "UPI_ID";

// Sanity bound for the UPI-ID method's mandatory Transaction ID / UTR:
// deliberately permissive (any bank's reference format) but bounded so
// arbitrarily long strings can never reach emails, bills, or history.
const TXN_ID_MAX_LENGTH = 64;

// Single-file ("proof") multipart parser that ALSO lets
// plain JSON requests through untouched (req.isMultipart).
const parseProofUpload = (req, res, next) => {
  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return next();
  }
  return proofUpload.single("proof")(req, res, (err) => {
    if (err) {
      const status = err.statusCode || 400;
      return res.status(status).json({
        success: false,
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "Payment screenshot must be 5 MB or smaller"
            : err.message || "Invalid payment screenshot",
      });
    }
    return next();
  });
};

router.post("/", protect, authorize("employee"), parseProofUpload, async (req, res) => {
  let uploadedPublicId = null; // for orphan cleanup if DB write fails

  try {
    const body = req.body || {};

    const courseCode = normalizeValue(body.courseCode);
    const transactionId = normalizeValue(body.transactionId);
    const paymentMethod = normalizeValue(body.paymentMethod);
    const payerUpiId = normalizeValue(body.payerUpiId).toLowerCase();

    if (!courseCode || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "courseCode and paymentMethod are required"
      });
    }

    if (paymentMethod !== PAYMENT_METHOD_QR && paymentMethod !== PAYMENT_METHOD_UPI_ID) {
      return res.status(400).json({
        success: false,
        message: "paymentMethod must be UPI or UPI_ID"
      });
    }

    const isUpiIdMethod = paymentMethod === PAYMENT_METHOD_UPI_ID;

    // QR method: transaction ID mandatory (unchanged behavior).
    if (!isUpiIdMethod && !transactionId) {
      return res.status(400).json({
        success: false,
        message: "courseCode, transactionId and paymentMethod are required"
      });
    }

    // UPI-ID method: valid payer UPI ID AND a non-empty Transaction ID /
    // UTR are mandatory (the UTR is a supporting reference for the admin's
    // independent funds verification — never proof of payment). Never
    // credentials (no PIN/OTP).
    if (isUpiIdMethod) {
      if (!payerUpiId || !isValidUpiId(payerUpiId)) {
        return res.status(400).json({
          success: false,
          message: "A valid payer UPI ID (e.g. name@bank) is required"
        });
      }

      // transactionId is already trimmed by normalizeValue above.
      if (!transactionId || transactionId.length > TXN_ID_MAX_LENGTH) {
        return res.status(400).json({
          success: false,
          message: "A transaction ID / UTR (1-64 characters) is required"
        });
      }
    }

    // Step 1 (optional): a "proof" file is NOT required — the
    // participant submits only the UPI transaction / reference ID.
    // Legacy/cached clients may still send a screenshot; when one
    // is supplied it MUST be a genuine JPEG/PNG/WebP image (magic
    // bytes, not extension/MIME).

    let proof = null;
    if (req.file) {
      if (!Buffer.isBuffer(req.file.buffer) || req.file.buffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Payment screenshot is empty or unreadable"
        });
      }
      if (req.file.buffer.length > MAX_PROOF_BYTES) {
        return res.status(400).json({
          success: false,
          message: "Payment screenshot must be 5 MB or smaller"
        });
      }
      const verifiedMime = detectImageMime(req.file.buffer);
      if (!verifiedMime) {
        return res.status(400).json({
          success: false,
          message:
            "Payment screenshot must be a genuine JPEG, PNG or WebP image (max 5 MB)"
        });
      }
      // Validated locally FIRST — only now does any byte reach Cloudinary.
      const stored = await uploadProofBuffer(req.file.buffer, verifiedMime);
      uploadedPublicId = stored.publicId;
      proof = {
        proofPublicId: stored.publicId,
        proofUrl: stored.secureUrl, // private delivery reference, not public
        proofMime: verifiedMime,
        proofSize: stored.bytes,
      };
    }

    // 1) Course must exist — the amount NEVER comes from the request body
    const course = await findCourseByCode(courseCode);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // 2) The payable amount must be configured on the course
    if (!isPositiveAmount(course.price)) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount is not configured for this course. Please contact the institute."
      });
    }

    // 3) Participant must already be enrolled (existing structure)
    const participant = await Employee.findById(req.user._id).maxTimeMS(8000);

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found"
      });
    }

    if (!isEnrolledInCourse(participant, course.courseCode)) {
      return res.status(400).json({
        success: false,
        message: "You are not enrolled in this course"
      });
    }

    // 4) Duplicate evidence must never create a second record.
    // QR: transaction IDs are globally single-use (partial unique index
    // backs this; pre-check gives the friendly 409). The UPI-ID path
    // performs its own transaction-ID checks inside the pending branch
    // below, so this pre-check stays exclusive to the QR method.
    if (!isUpiIdMethod) {
      const duplicate = await Payment.findOne({ transactionId }).maxTimeMS(8000);

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "This transaction ID has already been submitted"
        });
      }
    }

    // UPI-ID: one PENDING request per participant+course. A duplicate
    // submit returns the existing request (200) instead of creating
    // a second record — safe under concurrent double-clicks.
    // Rejected payments may be resubmitted (only PENDING blocks).
    if (isUpiIdMethod) {
      const existingPending = await Payment.findOne({
        participantId: req.user._id,
        courseCode: course.courseCode,
        status: "PENDING"
      }).maxTimeMS(8000);

      if (existingPending) {
        const existingTxn = normalizeValue(existingPending.transactionId);

        // (a) The SAME transaction ID is already saved on this pending
        // record: truthful duplicate/pending response — no second
        // record, and no false "saved" claim (it was saved previously).
        if (existingTxn === transactionId) {
          return res.status(200).json({
            success: true,
            message: "Payment submitted for verification",
            payment: {
              _id: existingPending._id,
              courseCode: existingPending.courseCode,
              amount: existingPending.amount,
              transactionId: existingPending.transactionId,
              paymentMethod: existingPending.paymentMethod,
              payerUpiId: existingPending.payerUpiId,
              status: existingPending.status,
              paymentDate: existingPending.paymentDate
            },
            duplicate: true
          });
        }

        // (b) A DIFFERENT transaction ID is already recorded: never
        // silently overwrite it.
        if (existingTxn) {
          return res.status(409).json({
            success: false,
            message:
              "Your pending payment request already has a different transaction ID. Contact the institute if this needs to change."
          });
        }

        // (c) The existing pending record has NO transaction ID yet
        // (legacy record): attach the submitted UTR — but only after
        // proving it is not already used by ANOTHER payment.
        const usedElsewhere = await Payment.findOne({
          transactionId,
          _id: { $ne: existingPending._id }
        }).maxTimeMS(8000);

        if (usedElsewhere) {
          return res.status(409).json({
            success: false,
            message: "This transaction ID has already been submitted"
          });
        }

        // Conditional update: ONLY a record that is still PENDING and
        // still lacking a transaction ID may receive one (race-safe).
        const attached = await Payment.findOneAndUpdate(
          { _id: existingPending._id, status: "PENDING", transactionId: null },
          { $set: { transactionId } },
          { new: true }
        );

        if (attached) {
          // The database confirmed the write — only now may the response
          // report the transaction ID as saved.
          return res.status(200).json({
            success: true,
            message: "Transaction ID saved to your pending payment request",
            payment: attached,
            duplicate: true,
            transactionIdSaved: true
          });
        }

        // Lost a race (status changed or another request attached a UTR
        // first): re-read the record and answer with the truth instead of
        // claiming an unsaved transaction ID was saved.
        const fresh = await Payment.findById(existingPending._id)
          .maxTimeMS(8000)
          .lean();
        const freshTxn = fresh ? normalizeValue(fresh.transactionId) : "";

        if (fresh && fresh.status === "PENDING" && freshTxn === transactionId) {
          // Another request already saved this exact UTR — truthful
          // duplicate/pending response.
          return res.status(200).json({
            success: true,
            message: "Payment submitted for verification",
            payment: {
              _id: fresh._id,
              courseCode: fresh.courseCode,
              amount: fresh.amount,
              transactionId: fresh.transactionId,
              paymentMethod: fresh.paymentMethod,
              payerUpiId: fresh.payerUpiId,
              status: fresh.status,
              paymentDate: fresh.paymentDate
            },
            duplicate: true
          });
        }

        const raceMessage =
          fresh && fresh.status === "PENDING" && freshTxn
            ? "Your pending payment request already has a different transaction ID. Contact the institute if this needs to change."
            : "The pending payment request was updated by another request. Refresh and try again.";

        return res.status(409).json({
          success: false,
          message: raceMessage
        });
      }

      // No pending record exists: this would create a BRAND-NEW request.
      // Its transaction ID must not already belong to any other payment
      // (friendly 409 here; the partial unique index is the race-safe
      // backstop at save time — E11000 is mapped to 409 below).
      const duplicate = await Payment.findOne({ transactionId }).maxTimeMS(8000);

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "This transaction ID has already been submitted"
        });
      }
    }

    const payment = new Payment({
      participantId: req.user._id,
      courseCode: course.courseCode,
      amount: course.price,
      // Both methods persist the real transaction / UTR reference
      // (validated non-empty above); UPI_ID additionally stores the
      // payer's own UPI ID. Nothing is ever invented.
      ...(transactionId ? { transactionId } : {}),
      ...(isUpiIdMethod ? { payerUpiId } : {}),
      paymentMethod,
      status: "PENDING",
      paymentDate: new Date(),
      ...(proof ? { ...proof } : {}),
    });

    await payment.save();

    uploadedPublicId = null; // persisted — do not delete on success path

    // Case 1: notify participant + admin. Runs only after the durable
    // save above; never throws and never changes the response. Emails
    // state PENDING verification and contain no bill number.
    await sendSubmissionEmails(participant, course, payment);

    return res.status(201).json({
      success: true,
      message: "Payment submitted for verification",
      payment
    });
  } catch (err) {
    // Orphan cleanup: Cloudinary upload succeeded but DB write failed.
    if (uploadedPublicId) await deleteProofAsset(uploadedPublicId);

    // unique transactionId index (race safe duplicate protection)
    if (err && err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This transaction ID has already been submitted"
      });
    }

    if (err && err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid payment data"
      });
    }

    console.error("PAYMENT CREATE ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* ============================================
   PROOF ACCESS (Step 1 — privacy)
   GET /api/payments/:id/proof
   Auth: protect (employee owner OR admin)

   The stored proofUrl is a PRIVATE delivery
   reference, not a public URL. This route checks
   ownership/role first, then mints a short-lived
   (~5 min) signed Cloudinary URL and redirects.
   A difficult-to-guess URL is NOT treated as
   access control — the backend check always runs.
============================================ */
router.get("/:id/proof", protect, async (req, res) => {
  try {
    const paymentId = String(req.params.id || "").trim();
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment id is required",
      });
    }

    const payment = await Payment.findById(paymentId)
      .select("participantId proofPublicId proofMime proofSize status")
      .maxTimeMS(8000)
      .lean();

    if (!payment || !payment.proofPublicId) {
      return res.status(404).json({
        success: false,
        message: "Payment proof not found",
      });
    }

    const role = getUserRole(req.user);
    const ownId = String(req.user._id || req.user.id || "");
    const ownerId = String(payment.participantId || "");

    if (role !== "admin" && !(role === "employee" && ownId && ownId === ownerId)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    const signedUrl = signedProofUrl(payment.proofPublicId, 300);
    return res.redirect(302, signedUrl);
  } catch (err) {
    console.error("PAYMENT PROOF ACCESS ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ============================================
   OFFICIAL RECEIPT DATA (Step 6D — read-only)
   GET /api/payments/:id/receipt
   Auth: protect (employee owner OR admin)

   - Read-only: never changes status, never allocates
     a bill number, never touches BillCounter.
   - Admin verification remains authoritative: only
     status === "PAID" returns a receipt.
   - A persisted billNumber is required. Legacy PAID
     payments without one are NOT backfilled here;
     they receive a safe error so the gap is reported.
   - Receipt fields come only from trusted backend
     records (Payment + Course + participant identity
     allowlist). No institute address / tax / GST data
     is invented, and no proof-storage internals
     (Cloudinary ids/URLs/credentials) are exposed.
============================================ */
router.get("/:id/receipt", protect, async (req, res) => {
  try {
    const paymentId = String(req.params.id || "").trim();

    if (isInvalidId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment id"
      });
    }

    const payment = await Payment.findById(paymentId)
      .populate("participantId", "firstName lastName email mobile")
      .maxTimeMS(8000)
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    const role = getUserRole(req.user);
    const ownId = String(req.user._id || req.user.id || "");
    const ownerId = String(
      (payment.participantId && payment.participantId._id) ||
        payment.participantId ||
        ""
    );

    if (role !== "admin" && !(role === "employee" && ownId && ownId === ownerId)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions"
      });
    }

    if (payment.status !== "PAID") {
      return res.status(409).json({
        success: false,
        message: "Official receipt is available only for paid payments"
      });
    }

    if (!payment.billNumber) {
      console.error(
        `RECEIPT LEGACY-DATA: PAID payment ${paymentId} has no persisted billNumber; receipt withheld, no number generated.`
      );
      return res.status(409).json({
        success: false,
        message:
          "Official receipt is not available for this payment (missing bill number). Please contact support."
      });
    }

    let courseName = "";
    if (payment.courseCode) {
      const course = await Course.findOne({ courseCode: payment.courseCode })
        .select("courseCode courseName")
        .maxTimeMS(8000)
        .lean();
      if (course) courseName = course.courseName || "";
    }

    const participant = payment.participantId || null;

    return res.status(200).json({
      success: true,
      receipt: {
        billNumber: payment.billNumber,
        courseCode: payment.courseCode,
        courseName,
        amount: payment.amount,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        verifiedAt: payment.verifiedAt,
        status: payment.status,
        participant: participant
          ? {
              firstName: participant.firstName || "",
              lastName: participant.lastName || "",
              email: participant.email || "",
              mobile: participant.mobile || ""
            }
          : null
      }
    });
  } catch (err) {
    console.error("PAYMENT RECEIPT ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* ============================================
   OFFICIAL BILL PDF (on-demand, no storage)
   GET /api/payments/:id/bill-pdf
   Auth: protect (employee owner OR admin)

   - Reuses the receipt authorization checks: JWT required,
     owner-or-admin only, PAID + persisted billNumber only.
   - Read-only: never allocates a bill number, never touches
     BillCounter. Uses the EXISTING persisted billNumber.
   - Fields come only from trusted backend records.
   - Responds with Content-Type: application/pdf and a safe
     filename based on the persisted bill number.
   - No public or guessable bill URLs; email links point at
     the authenticated frontend page, never here directly
     without auth.
   NOTE: Express matches by full path including segment count, so
   /:id/bill-pdf (3 segments) never collides with /:id/receipt,
   /:id/proof, /my-payments, or /admin/*. Route order preserved.
============================================ */
router.get("/:id/bill-pdf", protect, async (req, res) => {
  try {
    const paymentId = String(req.params.id || "").trim();

    if (isInvalidId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment id"
      });
    }

    const payment = await Payment.findById(paymentId)
      .populate("participantId", "firstName lastName email mobile")
      .maxTimeMS(8000)
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    const role = getUserRole(req.user);
    const ownId = String(req.user._id || req.user.id || "");
    const ownerId = String(
      (payment.participantId && payment.participantId._id) ||
        payment.participantId ||
        ""
    );

    if (role !== "admin" && !(role === "employee" && ownId && ownId === ownerId)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions"
      });
    }

    if (payment.status !== "PAID") {
      return res.status(409).json({
        success: false,
        message: "Official bill is available only for paid payments"
      });
    }

    if (!payment.billNumber) {
      console.error(
        `BILL-PDF LEGACY-DATA: PAID payment ${paymentId} has no persisted billNumber; PDF withheld, no number generated.`
      );
      return res.status(409).json({
        success: false,
        message:
          "Official bill is not available for this payment (missing bill number). Please contact support."
      });
    }

    let courseName = "";
    if (payment.courseCode) {
      const course = await Course.findOne({ courseCode: payment.courseCode })
        .select("courseCode courseName")
        .maxTimeMS(8000)
        .lean();
      if (course) courseName = course.courseName || "";
    }

    const participant = payment.participantId || null;
    const receipt = {
      billNumber: payment.billNumber,
      courseCode: payment.courseCode,
      courseName,
      amount: payment.amount,
      transactionId: payment.transactionId,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      verifiedAt: payment.verifiedAt,
      status: payment.status,
      participant: participant
        ? {
            firstName: participant.firstName || "",
            lastName: participant.lastName || "",
            email: participant.email || "",
            mobile: participant.mobile || ""
          }
        : null
    };

    const pdfBuffer = await generateBillPdf(receipt);
    const filename = billPdfFilename(payment.billNumber);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(pdfBuffer.length));
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PAYMENT BILL-PDF ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* ============================================
   MY PAYMENTS (own records only)
   GET /api/payments/my-payments
   Auth: protect + "employee" (participant) only

   The participant is identified ONLY by req.user._id.
   Any participantId supplied in the query string is
   ignored, so /my-payments?participantId=otherId can
   never expose another participant's records.
============================================ */
router.get("/my-payments", protect, authorize("employee"), async (req, res) => {
  try {
    const participantId = req.user._id;

    const payments = await Payment.find({ participantId })
      .sort({ paymentDate: -1, createdAt: -1 })
      .maxTimeMS(8000)
      .lean();

    // Attach courseName for display (not stored on the payment document)
    const codes = [
      ...new Set(payments.map((payment) => payment.courseCode).filter(Boolean))
    ];

    let nameByCode = {};

    if (codes.length > 0) {
      const courses = await Course.find({ courseCode: { $in: codes } })
        .select("courseCode courseName")
        .maxTimeMS(8000)
        .lean();

      nameByCode = courses.reduce((acc, course) => {
        acc[String(course.courseCode)] = course.courseName || "";
        return acc;
      }, {});
    }

    const result = payments.map((payment) => ({
      ...payment,
      courseName: nameByCode[String(payment.courseCode)] || ""
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      payments: result
    });
  } catch (err) {
    console.error("PAYMENT HISTORY ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* ============================================
   ADMIN PAYMENT VERIFICATION (manual review)
   GET  /api/payments/admin/pending
   PUT  /api/payments/admin/:id/approve
   PUT  /api/payments/admin/:id/reject
   Auth: protect + authorize("admin") on every route

   SECURITY
   - status, verifiedBy and verifiedAt are ALWAYS set
     by the server. The request body is only read for
     `adminRemarks`; any client supplied status /
     verifiedBy / verifiedAt / participantId / amount
     / courseCode / transactionId value is ignored.
   - verifiedBy comes from req.user._id (the
     authenticated admin), never from the client.
   - Strict state machine: only PENDING -> PAID and
     PENDING -> REJECTED are allowed. Already
     processed payments answer 409 and are never
     silently overwritten.
   - Employee.paymentStatus is NOT touched here
     (that is a separate future step).
============================================ */

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const isInvalidId = (id) => !OBJECT_ID_PATTERN.test(String(id || ""));

// Step 6C: official bill numbers — allocated server-side only at
// PENDING -> PAID approval time. No MongoDB transactions in this
// project (see config/db.js single-connection setup), so allocation
// is: atomic counter $inc first, then a single conditional payment
// update that sets status + billNumber together. A skipped number on
// a lost race is acceptable; reuse is never allowed.
const BILL_COUNTER_KEY = "payment-bill";

const formatBillNumber = (seq) =>
  `CEITCS-BILL-${String(seq).padStart(6, "0")}`;

const applyVerificationDecision = async (req, res, nextStatus) => {
  try {
    const paymentId = req.params.id;

    // PHASE 7 — ObjectId validation (400) / unknown payment (404)
    if (isInvalidId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment id"
      });
    }

    const existing = await Payment.findById(paymentId).maxTimeMS(8000).lean();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    // PHASE 8 — strict transitions: only PENDING may be processed
    if (existing.status !== "PENDING") {
      return res.status(409).json({
        success: false,
        message: `Payment has already been processed (status: ${existing.status})`
      });
    }

    const remark = normalizeValue(req.body && req.body.adminRemarks);

    // REJECTED path unchanged: no bill number is ever allocated here.
    if (nextStatus !== "PAID") {
      // A rejection must always carry a non-empty, trimmed reason.
      // normalizeValue trims, so whitespace-only also => 400.
      if (!remark) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required"
        });
      }

      const update = {
        status: nextStatus,
        verifiedBy: req.user._id,
        verifiedAt: new Date() // server timestamp
      };

      // Provided remark is stored, otherwise the existing value is kept
      if (remark) update.adminRemarks = remark;

      // Conditional update => race-safe PENDING-only transition
      const payment = await Payment.findOneAndUpdate(
        { _id: paymentId, status: "PENDING" },
        { $set: update },
        { new: true }
      );

      if (!payment) {
        return res.status(409).json({
          success: false,
          message: "Payment has already been processed"
        });
      }

      // Case 3: notify participant + admin — ONLY when this request won
      // the conditional PENDING -> REJECTED update above, so the feedback
      // in the emails is the persisted adminRemarks and repeated /
      // lost-race / failed rejections never send another rejection email.
      // Runs after the durable write; never throws and never changes the
      // response. No bill number is ever generated for a rejection.
      await sendRejectionEmails(payment);

      return res.status(200).json({
        success: true,
        message: "Payment rejected successfully",
        payment
      });
    }

    // APPROVE path — explicit admin attestation required BEFORE any
    // bill-number allocation: the request must carry the boolean
    // fundsVerified === true (the admin confirms they checked that the
    // funds were actually received). Missing / false / any other value
    // (e.g. the string "true") => 400, and no sequence number is
    // consumed. The attestation itself is NOT proof of payment — it
    // records that a human checked the actual funds.
    if (!req.body || req.body.fundsVerified !== true) {
      return res.status(400).json({
        success: false,
        message: "fundsVerified must be true: confirm you verified the funds were received"
      });
    }

    // APPROVE path (PENDING -> PAID): allocate the next bill number
    // atomically, then assign it together with the status change in one
    // conditional update. If this request loses a race, its allocated
    // number is skipped, never reused.
    const counter = await BillCounter.findOneAndUpdate(
      { key: BILL_COUNTER_KEY },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).maxTimeMS(8000);

    const billNumber = formatBillNumber(counter.seq);

    const approveUpdate = {
      status: "PAID",
      billNumber,
      verifiedBy: req.user._id,
      verifiedAt: new Date() // server timestamp
    };

    // Provided remark is stored, otherwise the existing value is kept
    if (remark) approveUpdate.adminRemarks = remark;

    // Conditional update => race-safe PENDING-only transition; the
    // payment can only become PAID together with its bill number.
    const payment = await Payment.findOneAndUpdate(
      { _id: paymentId, status: "PENDING" },
      { $set: approveUpdate },
      { new: true }
    );

    if (!payment) {
      // Another request won the race — keep its bill number untouched.
      return res.status(409).json({
        success: false,
        message: "Payment has already been processed"
      });
    }

    // Case 2: notify participant + admin — ONLY when this request won
    // the conditional PENDING -> PAID update above, so the bill number
    // in the emails is the persisted one and repeated / lost-race /
    // failed approvals never send another approval email. Runs after
    // the durable write; never throws and never changes the response.
    await sendApprovalEmails(payment);

    return res.status(200).json({
      success: true,
      message: "Payment approved successfully",
      payment
    });
  } catch (err) {
    console.error("PAYMENT VERIFICATION ERROR:", err.message);

    // Unique-index collision on billNumber (e.g. retried request):
    // report a safe conflict without leaking database internals.
    if (err && err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Payment has already been processed"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/* ============================================
   1) PENDING PAYMENTS QUEUE
   GET /api/payments/admin/pending
   Auth: protect + authorize("admin")
============================================ */
router.get("/admin/pending", protect, authorize("admin"), async (req, res) => {
  try {
    const payments = await Payment.find({ status: "PENDING" })
      .sort({ paymentDate: -1, createdAt: -1 })
      // participant identification only — never password / auth fields
      .populate("participantId", "firstName lastName email mobile")
      .maxTimeMS(8000)
      .lean();

    // courseName for display (same pattern as /my-payments)
    const codes = [
      ...new Set(payments.map((payment) => payment.courseCode).filter(Boolean))
    ];

    let nameByCode = {};

    if (codes.length > 0) {
      const courses = await Course.find({ courseCode: { $in: codes } })
        .select("courseCode courseName")
        .maxTimeMS(8000)
        .lean();

      nameByCode = courses.reduce((acc, course) => {
        acc[String(course.courseCode)] = course.courseName || "";
        return acc;
      }, {});
    }

    const result = payments.map((payment) => ({
      ...payment,
      participantId: payment.participantId || null,
      courseName: nameByCode[String(payment.courseCode)] || ""
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      payments: result
    });
  } catch (err) {
    console.error("ADMIN PENDING PAYMENTS ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* ============================================
   1b) APPROVED PAYMENTS LIST (automatic bill download)
   GET /api/payments/admin/approved?page=&limit=
   Auth: protect + authorize("admin")

   - Returns ONLY PAID records with a persisted string bill
     number (legacy PAID rows without a bill are excluded —
     they cannot produce a bill; use the bill-pdf endpoint's
     409 message for those IDs).
   - Minimal projection: never proof internals, never auth
     fields. Participant populate is identity-only.
   - Pagination: default limit 20, max 50, page >= 1.
   - Read-only: no status changes, no bill allocation.
   NOTE: "/admin/approved" (2 segments) cannot collide with
   "/admin/:id/approve" (3 segments) or "/:id/bill-pdf".
============================================ */
const APPROVED_DEFAULT_LIMIT = 20;
const APPROVED_MAX_LIMIT = 50;

router.get("/admin/approved", protect, authorize("admin"), async (req, res) => {
  try {
    let page = Number.parseInt(String(req.query.page || "1"), 10);
    let limit = Number.parseInt(String(req.query.limit || String(APPROVED_DEFAULT_LIMIT)), 10);

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = APPROVED_DEFAULT_LIMIT;
    if (limit > APPROVED_MAX_LIMIT) limit = APPROVED_MAX_LIMIT;

    const filter = { status: "PAID", billNumber: { $type: "string" } };

    const total = await Payment.countDocuments(filter).maxTimeMS(8000);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (page > totalPages) page = totalPages;
    const skip = (page - 1) * limit;

    const payments = await Payment.find(filter)
      .sort({ verifiedAt: -1, paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      // Minimal bill-download fields only — no proof internals,
      // no adminRemarks, no unrelated fields.
      .select("_id participantId courseCode amount transactionId payerUpiId paymentMethod paymentDate verifiedAt billNumber status")
      // participant identification only — never password / auth fields
      .populate("participantId", "firstName lastName email mobile")
      .maxTimeMS(8000)
      .lean();

    // courseName for display (same pattern as /admin/pending)
    const codes = [
      ...new Set(payments.map((payment) => payment.courseCode).filter(Boolean))
    ];

    let nameByCode = {};

    if (codes.length > 0) {
      const courses = await Course.find({ courseCode: { $in: codes } })
        .select("courseCode courseName")
        .maxTimeMS(8000)
        .lean();

      nameByCode = courses.reduce((acc, course) => {
        acc[String(course.courseCode)] = course.courseName || "";
        return acc;
      }, {});
    }

    const result = payments.map((payment) => ({
      ...payment,
      participantId: payment.participantId || null,
      courseName: nameByCode[String(payment.courseCode)] || ""
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      total,
      page,
      limit,
      totalPages,
      payments: result
    });
  } catch (err) {
    console.error("ADMIN APPROVED PAYMENTS ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* ============================================
   2) APPROVE — PENDING -> PAID
   PUT /api/payments/admin/:id/approve
   Auth: protect + authorize("admin")
============================================ */
router.put(
  "/admin/:id/approve",
  protect,
  authorize("admin"),
  (req, res) => applyVerificationDecision(req, res, "PAID")
);

/* ============================================
   3) REJECT — PENDING -> REJECTED
   PUT /api/payments/admin/:id/reject
   Auth: protect + authorize("admin")
============================================ */
router.put(
  "/admin/:id/reject",
  protect,
  authorize("admin"),
  (req, res) => applyVerificationDecision(req, res, "REJECTED")
);

module.exports = router;


