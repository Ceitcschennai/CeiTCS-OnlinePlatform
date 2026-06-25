const MentorRequest = require("../models/MentorRequest");
const transporter = require("../config/email");

const sendAdminEmail = async (requestData) => {
  const { requestType, visitorName, visitorEmail, visitorPhone, mentorName, mentorSubject, mentorPosition } = requestData;

  const subject = requestType === "booking"
    ? `New Mentor Booking Request - ${mentorName}`
    : `New Mentor Message - ${mentorName}`;

  let body = "";

  if (requestType === "booking") {
    body = `
      <h2>New Mentor Booking Request</h2>
      <p><strong>Mentor:</strong> ${mentorName}</p>
      <p><strong>Subject:</strong> ${mentorSubject}</p>
      ${mentorPosition ? `<p><strong>Position:</strong> ${mentorPosition}</p>` : ""}
      <hr />
      <p><strong>Visitor Name:</strong> ${visitorName}</p>
      <p><strong>Visitor Email:</strong> ${visitorEmail}</p>
      ${visitorPhone ? `<p><strong>Visitor Phone:</strong> ${visitorPhone}</p>` : ""}
      <p><strong>Preferred Date:</strong> ${requestData.preferredDate || "Not provided"}</p>
      <p><strong>Preferred Time:</strong> ${requestData.preferredTime || "Not provided"}</p>
      <p><strong>Purpose:</strong> ${requestData.purpose || "Not provided"}</p>
      <p><strong>Additional Notes:</strong> ${requestData.notes || "None"}</p>
      <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
    `;
  } else {
    body = `
      <h2>New Mentor Message</h2>
      <p><strong>Mentor:</strong> ${mentorName}</p>
      <p><strong>Subject:</strong> ${mentorSubject}</p>
      ${mentorPosition ? `<p><strong>Position:</strong> ${mentorPosition}</p>` : ""}
      <hr />
      <p><strong>Visitor Name:</strong> ${visitorName}</p>
      <p><strong>Visitor Email:</strong> ${visitorEmail}</p>
      ${visitorPhone ? `<p><strong>Visitor Phone:</strong> ${visitorPhone}</p>` : ""}
      <p><strong>Message Subject:</strong> ${requestData.subject || "Not provided"}</p>
      <p><strong>Message:</strong></p>
      <p>${requestData.message || "No message content"}</p>
      <p><strong>Submitted At:</strong> ${new Date().toLocaleString()}</p>
    `;
  }

  const adminEmail = process.env.EMAIL_USER || "admin@ceitcs.com";

  return await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        ${body}
      </div>
    `
  });
};

const submitMentorRequest = async (req, res) => {
  try {
    const { requestType, visitorName, visitorEmail, visitorPhone, mentorName, mentorSubject, mentorPosition, preferredDate, preferredTime, purpose, notes, subject, message } = req.body;

    if (!requestType || !["booking", "message"].includes(requestType)) {
      return res.status(400).json({ success: false, message: "Invalid request type" });
    }

    if (!visitorName || !visitorEmail || !mentorName || !mentorSubject) {
      return res.status(400).json({ success: false, message: "Required fields missing: visitorName, visitorEmail, mentorName, mentorSubject" });
    }

    const requestData = {
      requestType,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.trim().toLowerCase(),
      visitorPhone: visitorPhone ? visitorPhone.trim() : "",
      mentorName: mentorName.trim(),
      mentorSubject: mentorSubject.trim(),
      mentorPosition: mentorPosition ? mentorPosition.trim() : "",
    };

    if (requestType === "booking") {
      requestData.preferredDate = preferredDate ? preferredDate.trim() : "";
      requestData.preferredTime = preferredTime ? preferredTime.trim() : "";
      requestData.purpose = purpose ? purpose.trim() : "";
      requestData.notes = notes ? notes.trim() : "";
    } else {
      requestData.subject = subject ? subject.trim() : "";
      requestData.message = message ? message.trim() : "";
    }

    const mentorRequest = new MentorRequest(requestData);
    await mentorRequest.save();

    let emailSent = false;

    try {
      await sendAdminEmail(mentorRequest.toObject());
      mentorRequest.emailSent = true;
      await mentorRequest.save();
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send admin email:", emailError);
    }

    res.status(201).json({
      success: true,
      message: emailSent ? "Request submitted and admin notified successfully." : "Request submitted but email notification failed.",
      data: mentorRequest,
      emailSent
    });

  } catch (error) {
    console.error("Mentor request submission error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  submitMentorRequest
};
