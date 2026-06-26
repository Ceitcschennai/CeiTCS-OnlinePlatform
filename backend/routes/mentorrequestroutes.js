const express = require("express");
const router = express.Router();
const { submitMentorRequest } = require("../controllers/mentorRequestController");

router.post("/", submitMentorRequest);

module.exports = router;
