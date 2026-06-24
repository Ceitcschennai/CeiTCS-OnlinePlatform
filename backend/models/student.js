const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  email: String,
  password: String,
  pincode: String,
  document: String,
});

module.exports = mongoose.model("Student", studentSchema);