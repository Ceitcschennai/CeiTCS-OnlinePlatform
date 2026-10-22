/* ============================================
   BILL PDF UTILITY (on-demand, no storage)
   Generates a valid PDF bill from the persisted approved
   payment + trusted backend course/participant data.
   - Never accepts amounts or bill numbers from the client.
   - Never allocates a bill number (caller must supply the
     persisted payment.billNumber).
   - Pure function of the receipt record: same input bytes.
   Uses pdfkit (pure-JS, no native deps, Vercel-safe).
   ============================================ */

// ✅ Explicitly require PDFKit standard-font modules to prevent
// Vercel serverless builder from pruning them. These modules
// provide Helvetica, Helvetica-Bold, and other built-in fonts.
// Without this, Vercel's @vercel/node builder may prune the
// standard-fonts directory, causing "Cannot find module"
// errors at runtime in production.
require("pdfkit/js/standard-fonts/Helvetica.cjs");
require("pdfkit/js/standard-fonts/Helvetica-Bold.cjs");
require("pdfkit/js/standard-fonts/Helvetica-BoldOblique.cjs");
require("pdfkit/js/standard-fonts/Helvetica-Oblique.cjs");
require("pdfkit/js/standard-fonts/Courier.cjs");
require("pdfkit/js/standard-fonts/Courier-Bold.cjs");
require("pdfkit/js/standard-fonts/Courier-BoldOblique.cjs");
require("pdfkit/js/standard-fonts/Courier-Oblique.cjs");
require("pdfkit/js/standard-fonts/Times-Roman.cjs");
require("pdfkit/js/standard-fonts/Times-Bold.cjs");
require("pdfkit/js/standard-fonts/Times-Bold-Italic.cjs");
require("pdfkit/js/standard-fonts/Times-Italic.cjs");
require("pdfkit/js/standard-fonts/ZapfDingbats.cjs");

const PDFDocument = require("pdfkit");

const safeText = (value, fallback = "-") => {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text || fallback;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const formatAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Rs. -";
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/* receipt: { billNumber, courseCode, courseName, amount,
   transactionId, paymentMethod, paymentDate, verifiedAt,
   status, participant: { firstName, lastName, email, mobile } } */
const generateBillPdf = (receipt) =>
  new Promise((resolve, reject) => {
    try {
      const data = receipt || {};
      const participant = data.participant || {};
      const participantName =
        `${participant.firstName || ""} ${participant.lastName || ""}`.trim() || "-";

      const instituteName = safeText(process.env.INSTITUTE_NAME, "CEITCS");
      const contactEmail = (process.env.EMAIL_USER || "").trim();
      const contactPhone = (process.env.INSTITUTE_PHONE || "").trim();
      const contactAddress = (process.env.INSTITUTE_ADDRESS || "").trim();

      const doc = new PDFDocument({ size: "A4", margin: 56, info: {
        Title: `Bill ${data.billNumber || ""}`,
        Author: instituteName,
        Subject: "Official course fee bill",
      }});
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(20).font("Helvetica-Bold").text(instituteName, { align: "center" });
      doc.moveDown(0.2);
      doc.fontSize(11).font("Helvetica").fillColor("#444").text("Official Course Fee Bill", { align: "center" });
      const contactLine = [contactEmail, contactPhone, contactAddress].filter(Boolean).join("  |  ");
      if (contactLine) {
        doc.moveDown(0.2);
        doc.fontSize(9).text(contactLine, { align: "center" });
      }
      doc.fillColor("#000");
      doc.moveDown(0.5);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor("#999").stroke();
      doc.moveDown(0.8);

      const row = (label, value) => {
        doc.fontSize(11).font("Helvetica-Bold").text(label, { continued: true });
        doc.font("Helvetica").text(`  ${value}`);
        doc.moveDown(0.25);
      };

      doc.fontSize(13).font("Helvetica-Bold").text("Bill Details");
      doc.moveDown(0.4);
      row("Bill Number:", safeText(data.billNumber));
      row("Bill Date:", formatDate(data.verifiedAt || data.paymentDate));
      row("Status:", safeText(data.status, "PAID"));
      doc.moveDown(0.4);

      doc.fontSize(13).font("Helvetica-Bold").text("Participant");
      doc.moveDown(0.4);
      row("Name:", safeText(participantName));
      row("Email:", safeText(participant.email));
      row("Mobile:", safeText(participant.mobile));
      doc.moveDown(0.4);

      doc.fontSize(13).font("Helvetica-Bold").text("Course & Payment");
      doc.moveDown(0.4);
      const courseLabel = data.courseName
        ? `${data.courseName} (${data.courseCode || ""})`
        : safeText(data.courseCode);
      row("Course:", courseLabel);
      row("Course Code:", safeText(data.courseCode));
      row("Amount Paid:", formatAmount(data.amount));
      row("Payment Method:", safeText(data.paymentMethod, "UPI"));
      row("Transaction / Reference ID:", safeText(data.transactionId));
      row("Payment Date:", formatDate(data.paymentDate));
      row("Verified At:", formatDate(data.verifiedAt));
      doc.moveDown(0.8);

      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor("#999").stroke();
      doc.moveDown(0.6);
      doc.fontSize(9).fillColor("#555").font("Helvetica").text(
        `This is a computer-generated bill for ${safeText(data.billNumber)}. Please keep the bill number for your records. Verified backend record — admin-approved payment.`,
        { align: "center" }
      );
      doc.fillColor("#000");

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

/* Safe attachment filename derived ONLY from the persisted bill number. */
const billPdfFilename = (billNumber) => {
  const clean = String(billNumber || "bill").replace(/[^A-Za-z0-9-_]/g, "-").slice(0, 80) || "bill";
  return `${clean}.pdf`;
};

module.exports = { generateBillPdf, billPdfFilename };
