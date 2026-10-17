const mongoose = require("mongoose");

/* ============================================
   BILL COUNTER (official payment bill numbers)

   Dedicated sequence collection for server-side
   bill-number allocation. Values are allocated
   by the next implementation step using an atomic
   MongoDB findOneAndUpdate with $inc — never via
   countDocuments() or frontend-generated numbers.

   One document per sequence key, e.g.
     { key: "paymentBill", seq: 1042 }
============================================ */

const billCounterSchema = new mongoose.Schema(
  {
    // Sequence identifier, e.g. "paymentBill"
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },

    // Last allocated sequence value
    seq: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("BillCounter", billCounterSchema);
