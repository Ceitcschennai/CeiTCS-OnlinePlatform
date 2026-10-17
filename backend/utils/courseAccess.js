/* ============================================================
   COURSE-LEVEL ACCESS PREDICATE — Step 13 approved rules
     A1  Employee.paymentStatus = account-level manual flag
     B2  latest Payment (createdAt DESC, _id DESC tie-break)
         for the EXACT (participantId, courseCode) pair
     C1  ACCESS = manual flag === "Paid"  OR  latest === "PAID"
     D1  latest PENDING / REJECTED -> no payment-derived access
     F-A Payment records are read directly (no entitlement store)

   Read-only: this helper NEVER modifies Payment or Employee.
   Identity: callers MUST pass req.user._id (never client input).
   ============================================================ */

const Employee = require("../models/Employee");
const Payment = require("../models/Payment");

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalize = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const courseKey = (value) => normalize(value).toLowerCase();

/* Latest payment status per course for one participant.
   Ordering: createdAt DESC, then _id DESC (deterministic tie-break
   on the MongoDB document object identifier — server created only). */
const latestPaymentStatusByCourse = async (participantId) => {
  const map = new Map();

  if (!participantId) return map;

  const payments = await Payment.find({ participantId })
    .sort({ createdAt: -1, _id: -1 })
    .select("courseCode status")
    .maxTimeMS(8000)
    .lean();

  for (const payment of payments) {
    const key = courseKey(payment.courseCode);
    if (key && !map.has(key)) map.set(key, payment.status);
  }

  return map;
};

/* Pure combination of the manual flag + latest payment decision.
   Never broadcasts one course's payment across other courses. */
const decideAccess = (paymentStatus, latestStatusByCourse, courseCode) => {
  // C1 manual branch (A1 account-level flag)
  if (paymentStatus === "Paid") return true;

  const key = courseKey(courseCode);
  if (!key) return false;

  // B2 + D1: only a latest PAID grants payment-derived access
  return latestStatusByCourse.get(key) === "PAID";
};

/* Full predicate: loads the participant, manual flag, payments,
   applies B2/D1/C1 and returns the decision. Read-only. */
const hasCourseAccess = async (participantId, courseCode) => {
  if (!participantId) return false;

  const employee = await Employee.findById(participantId)
    .select("paymentStatus")
    .maxTimeMS(8000)
    .lean();

  if (!employee) return false;

  if (!courseCode) return employee.paymentStatus === "Paid";

  const latest = await latestPaymentStatusByCourse(participantId);
  return decideAccess(employee.paymentStatus, latest, courseCode);
};

/* Batch version: returns a Set of LOWERCASED course codes (from
   candidateCodes) that the participant may access. */
const accessibleCourseCodes = async (participantId, candidateCodes) => {
  const accessible = new Set();
  const codes = (candidateCodes || []).map(normalize).filter(Boolean);

  if (!participantId || codes.length === 0) return accessible;

  const employee = await Employee.findById(participantId)
    .select("paymentStatus")
    .maxTimeMS(8000)
    .lean();

  if (!employee) return accessible;

  if (employee.paymentStatus === "Paid") {
    codes.forEach((code) => accessible.add(courseKey(code)));
    return accessible;
  }

  const latest = await latestPaymentStatusByCourse(participantId);

  codes.forEach((code) => {
    if (latest.get(courseKey(code)) === "PAID") accessible.add(courseKey(code));
  });

  return accessible;
};

/* Filter candidate participants by course-level access for ONE course
   (used by schedule email recipient selection). Employees are provided
   by the caller (already loaded); returns the subset allowed. */
const filterByCourseAccess = async (courseCode, employees) => {
  if (!Array.isArray(employees) || employees.length === 0) return [];

  const key = courseKey(courseCode);

  if (!key) {
    return employees.filter((e) => e && e.paymentStatus === "Paid");
  }

  const pattern = new RegExp(`^${escapeRegExp(normalize(courseCode))}$`, "i");
  const payments = await Payment.find({
    participantId: { $in: employees.map((e) => e._id) },
    courseCode: pattern
  })
    .sort({ createdAt: -1, _id: -1 })
    .select("participantId status")
    .maxTimeMS(8000)
    .lean();

  // B2: first row per participant in DESC order = latest decision
  const seen = new Set();
  const paidIds = new Set();

  for (const payment of payments) {
    const id = String(payment.participantId);
    if (seen.has(id)) continue;
    seen.add(id);
    if (payment.status === "PAID") paidIds.add(id);
  }

  return employees.filter(
    (e) =>
      e && (e.paymentStatus === "Paid" || paidIds.has(String(e._id)))
  );
};

module.exports = {
  hasCourseAccess,
  accessibleCourseCodes,
  filterByCourseAccess,
  latestPaymentStatusByCourse,
  decideAccess,
  normalize,
  courseKey
};
