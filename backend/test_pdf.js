const PDFDocument = require("pdfkit");

const doc = new PDFDocument({ size: "A4", margin: 56 });
const chunks = [];
doc.on("data", (chunk) => chunks.push(chunk));
doc.on("end", () => {
  const pdfBuffer = Buffer.concat(chunks);
  console.log("PDF generated successfully, size:", pdfBuffer.length, "bytes");
  console.log("Fonts used: Helvetica, Helvetica-Bold");
  process.exit(0);
});
doc.on("error", (err) => {
  console.error("PDF error:", err.message);
  process.exit(1);
});

// Use Helvetica fonts as the bill PDF does
doc.fontSize(20).font("Helvetica-Bold").text("Test Institute", { align: "center" });
doc.moveDown(0.2);
doc.fontSize(11).font("Helvetica").text("Official Course Fee Bill", { align: "center" });
doc.end();