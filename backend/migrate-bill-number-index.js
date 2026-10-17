/* ============================================================
   MIGRATION: replace the billNumber unique-SPARSE index with a
   unique-PARTIAL index (P0 fix from the payment readiness audit).

   WHY
   ---
   The Payment schema previously declared:
       billNumber: { type: String, default: null }
       paymentSchema.index({ billNumber: 1 }, { unique: true, sparse: true })
   A sparse index skips only documents where the field is MISSING, so
   every document that stored an explicit `null` (all PENDING /
   REJECTED payments) was indexed. Under the unique constraint the
   SECOND such document failed with E11000 on insert.

   THE CORRECTED DESIGN (see backend/models/Payment.js)
   ----------------------------------------------------
       - `default: undefined` -> unissued payments omit the field
       - unique partial index with
         partialFilterExpression: { billNumber: { $type: "string" } }
         -> uniqueness applies only to issued (string) bill numbers;
            explicit nulls / missing fields are simply not indexed.

   SCOPE
   -----
   This script performs ONLY index inspection and index replacement
   on the `payments` collection. It NEVER creates, updates or deletes
   payment documents, and it never touches issued bill numbers. The
   duplicate pre-check is a read-only aggregation that returns GROUP
   COUNTS ONLY (no bill numbers or payment data are printed, and no
   credentials are ever logged).

   USAGE (manual only — this script is NOT wired into server.js,
   package.json, or any frontend build step, and never runs
   automatically):
       node backend/migrate-bill-number-index.js            # dry run
       node backend/migrate-bill-number-index.js --apply    # perform

   Requires MONGODB_URI (backend/.env or environment). Run during a
   quiet period: dropping and re-creating the index is not atomic, so
   the unique guarantee on billNumber is briefly absent between the
   two operations (harmless in practice because numbers are allocated
   from the atomic BillCounter sequence).
   ============================================================ */

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const mongoose = require("mongoose");

// This process must never build or alter indexes implicitly — the
// only index operations are the explicit ones inside the apply path.
mongoose.set("autoIndex", false);

const Payment = require("./models/Payment");

const LOG_PREFIX = "[migrate-bill-number-index]";
const log = (msg) => console.log(`${LOG_PREFIX} ${msg}`);
const logError = (msg) => console.error(`${LOG_PREFIX} ${msg}`);

const APPLY = process.argv.includes("--apply");

const COLLECTION_NAME = Payment.collection.name; // "payments"
const BILL_NUMBER_KEY = { billNumber: 1 };
const DESIRED_OPTIONS = {
  unique: true,
  partialFilterExpression: { billNumber: { $type: "string" } }
};

const isBillNumberIndex = (index) =>
  index.key &&
  Object.keys(index.key).length === 1 &&
  index.key.billNumber === 1;

const matchesDesired = (index) => {
  const pfe = index.partialFilterExpression;
  return (
    index.unique === true &&
    !!pfe &&
    Object.keys(pfe).length === 1 &&
    !!pfe.billNumber &&
    pfe.billNumber.$type === "string"
  );
};

// Safe to print: index metadata only, never payment data.
const describeIndex = (index) => {
  const parts = [`name="${index.name}"`, `unique=${index.unique === true}`];
  parts.push(
    index.partialFilterExpression
      ? `partialFilterExpression=${JSON.stringify(index.partialFilterExpression)}`
      : `sparse=${index.sparse === true}`
  );
  return parts.join(" ");
};

// Read-only duplicate detection. Returns the number of bill-number
// values stored on more than one document. Values are payment
// information and are deliberately never printed.
const countDuplicateBillNumberGroups = async (collection) => {
  const groups = await collection
    .aggregate([
      { $match: { billNumber: { $type: "string" } } },
      { $group: { _id: "$billNumber", n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } }
    ])
    .toArray();
  return groups.length;
};


const main = async () => {
  // 1. The corrected schema must already be in place, otherwise the
  //    application itself would still expect the old definition.
  const declared = Payment.schema
    .indexes()
    .find(
      ([keys, options]) =>
        keys &&
        Object.keys(keys).length === 1 &&
        keys.billNumber === 1 &&
        options &&
        options.unique === true &&
        !!options.partialFilterExpression
    );

  if (!declared) {
    logError(
      "ABORT: backend/models/Payment.js does not declare the corrected unique partial billNumber index. Nothing was changed."
    );
    return 1;
  }

  // 2. Explicit connection — connectDB throws when MONGODB_URI is not
  //    configured. No connection is opened unless this script is
  //    deliberately invoked.
  const connectDB = require("./config/db");
  await connectDB();

  try {
    const collection = mongoose.connection.db.collection(COLLECTION_NAME);

    log(
      `Mode: ${APPLY ? "APPLY (indexes will be modified)" : "DRY RUN (no modifications)"}`
    );
    log(`Collection: "${COLLECTION_NAME}"`);

    // 3. Inspect current index state.
    const billIndexes = (await collection.indexes()).filter(isBillNumberIndex);
    if (billIndexes.length === 0) {
      log("No index on { billNumber: 1 } exists yet.");
    } else {
      for (const idx of billIndexes) {
        log(`Existing billNumber index: ${describeIndex(idx)}`);
      }
    }

    // 4. Duplicate pre-check — stop before any index change if two
    //    documents share a bill number (preserve all issued numbers).
    const duplicateGroups = await countDuplicateBillNumberGroups(collection);
    if (duplicateGroups > 0) {
      logError(
        `ABORT: ${duplicateGroups} bill number value(s) exist on more than one payment document.`
      );
      logError(
        "No index was created, dropped or modified. Resolve the duplicates manually first (this script never edits payment records)."
      );
      return 1;
    }
    log("Duplicate check: no duplicate string bill numbers found.");

    const mismatched = billIndexes.filter((idx) => !matchesDesired(idx));
    const correct = billIndexes.filter(matchesDesired);

    // 5. Dry run — report intended operations and stop.
    if (!APPLY) {
      if (mismatched.length === 0 && correct.length > 0) {
        log("Desired unique partial index already exists. Nothing to do.");
        return 0;
      }
      for (const idx of mismatched) {
        log(`  WOULD DROP: ${describeIndex(idx)}`);
      }
      if (correct.length === 0) {
        log(
          `  WOULD CREATE: { billNumber: 1 } with ${JSON.stringify(DESIRED_OPTIONS)}`
        );
      }
      log(
        "Dry run complete — no changes were made. Re-run with --apply to perform the replacement."
      );
      return 0;
    }

    // 6. Apply — replace any old/incorrect billNumber index.
    for (const idx of mismatched) {
      await collection.dropIndex(idx.name);
      log(`Dropped index "${idx.name}" (old/incorrect billNumber index).`);
    }

    const stillPresent = (await collection.indexes()).some(
      (idx) => isBillNumberIndex(idx) && matchesDesired(idx)
    );
    if (!stillPresent) {
      await collection.createIndex(BILL_NUMBER_KEY, DESIRED_OPTIONS);
      log(
        'Created index { billNumber: 1 } unique + partialFilterExpression { billNumber: { $type: "string" } }.'
      );
    }

    // 7. Verify final state — exactly one correct billNumber index.
    const finalIndexes = (await collection.indexes()).filter(isBillNumberIndex);
    if (finalIndexes.length !== 1 || !matchesDesired(finalIndexes[0])) {
      logError("ABORT: final index state does not match the intended design.");
      for (const idx of finalIndexes) logError(`  final: ${describeIndex(idx)}`);
      return 1;
    }

    log(`Done. Final state: ${describeIndex(finalIndexes[0])}`);
    log("Payment records and issued bill numbers were not modified.");
    return 0;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    logError(`FAILED: ${err && err.message ? err.message : "unknown error"}`);
    logError("No payment data was modified by this script.");
    process.exit(1);
  });
