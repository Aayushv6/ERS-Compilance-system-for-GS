 
const express = require("express");
const router = express.Router();
const { saveResponsesToExcel } = require("../utils/excelService");
 
/* Inside routes/formSubmission.js */

router.post("/", async (req, res) => {
  const { eventId, departmentId, answers } = req.body;

  try {
    // Upsert logic: If a response exists for this event, update it. If not, create it.
    const response = await Response.findOneAndUpdate(
      { event: eventId }, // Search criteria
      { 
        department: departmentId,
        answers: answers,
        submittedAt: new Date()
      },
      { upsert: true, new: true } // Create if doesn't exist
    );

    // Mark the event as 'sent' or 'completed' so it leaves the pending queue
    await Event.findByIdAndUpdate(eventId, { status: "sent" });

    res.json({ message: "Form submitted successfully", response });
  } catch (error) {
    res.status(500).json({ error: "Submission failed" });
  }
});

// Change path to "/" because it's mounted under /api/submit-form
router.post("/", (req, res) => {
  const { departmentName, questions, answers } = req.body;
 
  try {
    const filePath = saveResponsesToExcel(departmentName, questions, answers);
    res.json({ message: "Responses saved!", filePath });
  } catch (err) {
    console.error("saveResponsesToExcel error:", err);
    res.status(500).json({ message: "Error saving responses" });
  }
});
 
module.exports = router
 